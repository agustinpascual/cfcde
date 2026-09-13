import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function carregar(arquivo, dependencias, globals = {}) {
  const exports = {};
  const fonte = readFileSync(new URL(arquivo, import.meta.url), "utf8");
  const js = ts.transpileModule(fonte, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(js, { exports, console, Response, TextEncoder, ...globals, require(id) {
    if (id in dependencias) return dependencias[id];
    throw new Error(`Dependência não autorizada: ${id}`);
  } });
  return exports;
}
const corpoJson = carregar("../src/lib/corpo-json.ts", { "server-only": {} });

function webhook(opcoes = {}) {
  const chamadas = [], envios = [], leituras = [], esperas = [];
  const treinamento = { ativo: true, exemplos: [], saudacao_ativa: false, saudacao_mensagem: "Olá, bem-vindo!", escalar_mensagem: "Vou chamar nossa equipe.", ...opcoes.treinamento };
  const db = { from(tabela) {
    let acao, dados, campos;
    const filtros = [];
    const resultado = () => {
      chamadas.push({ tabela, acao, dados, campos, filtros });
      if (tabela === "conversas" && acao === "upsert") return { data: { id: "conversa-1", robo_ativo: opcoes.roboAtivo ?? true, nao_lidas: 0 }, error: null };
      if (tabela === "conversas" && campos === "saudou_em") return { data: { saudou_em: null }, error: null };
      if (tabela === "mensagens" && campos === "id") return { data: { id: opcoes.maisNova && !filtros.some(([k]) => k === "zap_id") ? "outra-mensagem" : "mensagem-1" }, error: null };
      if (tabela === "mensagens" && campos === "autor,texto") return { data: [{ autor: "cliente", texto: "Qual o prazo?" }], error: null };
      return { data: null, error: null };
    };
    const q = {
      upsert(valor) { acao = "upsert"; dados = valor; return q; },
      insert(valor) { acao = "insert"; dados = valor; return q; },
      update(valor) { acao = "update"; dados = valor; return q; },
      select(valor) { campos = valor; return q; },
      eq(...valor) { filtros.push(valor); return q; },
      order() { return q; }, limit() { return q; },
      async single() { return resultado(); }, async maybeSingle() { return resultado(); },
      then(resolve) { return Promise.resolve(resultado()).then(resolve); },
    };
    return q;
  } };
  const api = carregar("../src/app/api/webhooks/zapi/route.ts", {
    "next/server": { NextResponse: Response },
    "@/lib/robo": {
      enviarWhatsApp: async (...args) => { envios.push(args); },
      lerTreinamento: async () => treinamento,
      responder: async () => ({ texto: "O prazo aparece no checkout.", escalar: false, ...opcoes.resposta }),
    },
    "@/lib/aprendizado": { registrarDuvida: async () => {} },
    "@/lib/robo-interno": { responderLocal: () => null },
    "@/lib/supabase/servidor": { supabaseAdmin: () => opcoes.semBanco ? null : db },
    "@/lib/config-integracoes": { ler: async chave => {
      leituras.push(chave);
      assert.equal(chave, "ZAPI_INSTANCIA", "webhook não deve consultar um segredo adicional");
      if (opcoes.erroConfig) throw new Error("cofre indisponível");
      return "instancia-teste";
    } },
    "@/lib/corpo-json": corpoJson,
    "@/lib/limite": { excedeu: () => opcoes.limitado ?? false, ipDe: () => "127.0.0.1" },
  }, {
    process: { env: { ZAPI_WEBHOOK_SECRET: "segredo-antigo-que-nao-deve-ser-exigido" } },
    setTimeout: (callback, ms) => { esperas.push(ms); callback(); },
  });
  return { ...api, chamadas, envios, leituras, esperas };
}

const mensagem = { instanceId: "instancia-teste", phone: "5511999999999", messageId: "mensagem-zapi", text: { message: "Qual o prazo?" }, fromMe: false };
const req = (dados = {}, sufixo = "") => new Request(`https://loja.example/api/webhooks/zapi${sufixo}`, {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...mensagem, ...dados }),
});

test("URL simples recebe, salva e responde sem segredo, inclusive se havia segredo antigo no ambiente", async () => {
  const api = webhook();
  const r = await api.POST(req());
  assert.equal(r.status, 200);
  assert.equal((await r.json()).respondeu, true);
  assert.deepEqual(api.leituras, ["ZAPI_INSTANCIA"]);
  assert.deepEqual(api.envios, [["5511999999999", "O prazo aparece no checkout."]]);
  assert.ok(api.chamadas.some(c => c.tabela === "mensagens" && c.dados?.autor === "cliente" && c.dados.zap_id === "mensagem-zapi"));
  assert.ok(api.chamadas.some(c => c.tabela === "mensagens" && c.dados?.autor === "robo"));
  assert.deepEqual(api.esperas, [9000]);
});

test("URL antiga com parâmetro chave continua compatível", async () => {
  const api = webhook({ roboAtivo: false });
  assert.equal((await api.POST(req({}, "?chave=valor-antigo"))).status, 200);
  assert.equal(api.envios.length, 0);
});

test("instância diferente ou ausente é recusada antes de gravar e responder", async () => {
  for (const instanceId of ["outra-instancia", undefined]) {
    const api = webhook();
    assert.equal((await api.POST(req({ instanceId }))).status, 401);
    assert.equal(api.chamadas.length, 0);
    assert.equal(api.envios.length, 0);
  }
});

test("ignora mensagens próprias, grupos, canais, transmissão e callbacks sem texto", async () => {
  for (const [dados, motivo] of [
    [{ fromMe: true }, "propria"], [{ isGroup: true }, "grupo"],
    [{ phone: "123@g.us" }, "grupo"], [{ isNewsletter: true }, "grupo"],
    [{ broadcast: true }, "grupo"], [{ text: null }, "sem_texto"],
  ]) {
    const api = webhook();
    assert.equal((await (await api.POST(req(dados))).json()).ignorado, motivo);
    assert.equal(api.chamadas.length, 0);
    assert.equal(api.envios.length, 0);
  }
});

test("preserva robô desligado por conversa e treinamento inativo", async () => {
  for (const opcoes of [{ roboAtivo: false }, { treinamento: { ativo: false } }]) {
    const api = webhook(opcoes);
    assert.equal((await api.POST(req())).status, 200);
    assert.equal(api.envios.length, 0);
    assert.ok(api.chamadas.some(c => c.dados?.autor === "cliente"));
  }
});

test("boas-vindas e janela de mensagens mantêm comportamento anterior", async () => {
  const saudacao = webhook({ treinamento: { saudacao_ativa: true } });
  assert.equal((await (await saudacao.POST(req({ text: { message: "oi" } }))).json()).saudou, true);
  assert.deepEqual(saudacao.envios, [["5511999999999", "Olá, bem-vindo!"]]);
  const seguida = webhook({ maisNova: true });
  assert.equal((await (await seguida.POST(req())).json()).ignorado, "mensagem_mais_nova");
  assert.equal(seguida.envios.length, 0);
});

test("encaminhamento crítico continua marcando atendimento humano", async () => {
  const api = webhook({ resposta: { escalar: true, critico: true } });
  assert.equal((await (await api.POST(req())).json()).escalou, true);
  assert.ok(api.chamadas.some(c => c.acao === "update" && c.dados?.status === "pendente" && c.dados.robo_ativo === false));
});

test("preserva limites de requisição e tratamento de configuração indisponível", async () => {
  assert.equal((await webhook({ limitado: true }).POST(req())).status, 429);
  assert.equal((await webhook({ erroConfig: true }).POST(req())).status, 503);
  assert.equal((await webhook({ semBanco: true }).POST(req())).status, 202);
  const api = webhook();
  assert.equal((await api.POST(new Request("https://loja.example/api/webhooks/zapi", { method: "POST", body: "{}" }))).status, 415);
  assert.equal((await api.POST(new Request("https://loja.example/api/webhooks/zapi", { method: "POST", headers: { "content-type": "application/json" }, body: "{" }))).status, 400);
  assert.equal((await api.POST(req({ text: { message: "a".repeat(66_000) } }))).status, 413);
  assert.equal(api.envios.length, 0);
});

test("envios de texto, mídia e botão Pix preservam token da instância e Client-Token", async () => {
  const chamadas = [];
  const config = { ZAPI_INSTANCIA: "instancia-teste", ZAPI_TOKEN: "token-teste", ZAPI_CLIENT_TOKEN: "client-teste" };
  const api = carregar("../src/lib/robo.ts", {
    "server-only": {}, "@anthropic-ai/sdk": class {},
    "./config-integracoes": { ler: async chave => { assert.ok(chave in config); return config[chave]; } },
    "./gemini": {}, "./robo-interno": {}, "./supabase/servidor": {},
  }, { fetch: async (url, options) => { chamadas.push({ url, options }); return Response.json({ messageId: "simulado" }); } });
  await api.enviarWhatsApp("5511999999999", "Teste simulado");
  await api.enviarMidiaWhatsApp("5511999999999", "data:image/png;base64,AAA", "imagem");
  await api.enviarWhatsAppComBotaoCopiar("5511999999999", "Pix simulado", "codigo-simulado");
  assert.deepEqual(chamadas.map(c => new URL(c.url).pathname.split("/").at(-1)), ["send-text", "send-image", "send-button-otp"]);
  for (const { url, options } of chamadas) {
    assert.ok(url.startsWith("https://api.z-api.io/instances/instancia-teste/token/token-teste/"));
    assert.equal(options.headers["Client-Token"], "client-teste");
    assert.equal(options.method, "POST");
  }
});
