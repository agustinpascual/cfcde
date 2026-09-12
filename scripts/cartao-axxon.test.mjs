import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as cartao from "../src/lib/cartao.ts";
import { CHAVE_PAGAMENTO, lerPagamentoDaTela, salvarPagamentoParaTela } from "../src/lib/pagamento-navegacao.ts";

// Rotas reais transpiladas com dependências simuladas: sem rede, banco ou cartão real.
function modulo(caminho, deps) {
  const fonte = readFileSync(new URL(caminho, import.meta.url), "utf8");
  const js = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports, Response, Request, Headers, URL, AbortSignal, setTimeout, fetch: deps.$fetch ?? globalThis.fetch, require: id => {
    if (id === "$fetch") throw new Error("Dependência interna inválida");
    if (!(id in deps)) throw new Error(`Dependência externa não autorizada no teste: ${id}`);
    return deps[id];
  } });
  return exports;
}
const fonte = caminho => readFileSync(new URL(caminho, import.meta.url), "utf8");
const cartaoTeste = { numero: "4111 1111 1111 1111", titular: "Cliente Ficticio", mes: 12, ano: 2035, cvv: "123" };

test("navegação Pix preserva autorização de comprovante sem guardar dados do cliente", () => {
  const anterior = globalThis.sessionStorage;
  const memoria = new Map();
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: {
    getItem: chave => memoria.get(chave) ?? null,
    setItem: (chave, valor) => memoria.set(chave, valor),
  } });
  try {
    salvarPagamentoParaTela({ id: "pix-teste", pedido: "123456", total: 1234, metodo: "pix", comprovante_token: "token-ficticio",
      cliente_documento: "NAO-ARMAZENAR", cartao: cartaoTeste });
    assert.equal(lerPagamentoDaTela().comprovante_token, "token-ficticio");
    assert.ok(!memoria.get(CHAVE_PAGAMENTO).includes("NAO-ARMAZENAR"));
    assert.ok(!memoria.get(CHAVE_PAGAMENTO).includes("4111"));
  } finally { Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: anterior }); }
});

test("validarCartao normaliza e recusa sem ecoar o valor", () => {
  const agora = new Date(2026, 8, 9);
  assert.deepEqual(cartao.validarCartao(cartaoTeste, agora), { number: "4111111111111111", holderName: "Cliente Ficticio", expirationMonth: 12, expirationYear: 2035, cvv: "123" });
  assert.deepEqual(cartao.validarCartao({ ...cartaoTeste, mes: 9, ano: 2026 }, agora).expirationMonth, 9, "vale até o fim do mês corrente");
  for (const invalido of [
    { ...cartaoTeste, numero: "4111111111111112" }, { ...cartaoTeste, numero: "411111111111" }, { ...cartaoTeste, mes: 8, ano: 2026 },
    { ...cartaoTeste, ano: 2050 }, { ...cartaoTeste, cvv: "12345" }, { ...cartaoTeste, titular: "A<b>" }, { ...cartaoTeste, titular: "x".repeat(61) }, [], undefined,
  ]) {
    assert.throws(() => cartao.validarCartao(invalido, agora), erro => !/4111|1111/.test(erro.message));
  }
  assert.equal(cartao.luhn("4111111111111111"), true);
  assert.equal(cartao.luhn("4111111111111111a"), false);
  assert.deepEqual(cartao.semCartao({ nome: "x", cartao: cartaoTeste, cardHash: "t", cvv: "1", card: {}, numeroCartao: "1", chaveAtivacao: "1" }), { nome: "x" });
});

test("parcelamento aplica a tabela comercial somente acima de 4x", () => {
  const esperado = new Map([[1, 0], [2, 0], [3, 0], [4, 0], [5, 25], [6, 27], [7, 30], [8, 33], [9, 36], [10, 38], [11, 40], [12, 42]]);
  for (const [parcelas, percentual] of esperado) {
    const plano = cartao.calcularParcelamentoCartao(10000, parcelas);
    assert.equal(plano.percentual, percentual);
    assert.equal(plano.acrescimo, percentual * 100);
    assert.equal(plano.total, 10000 + percentual * 100);
  }
  for (const parcelas of [0, 13, 5.5, NaN]) assert.throws(() => cartao.calcularParcelamentoCartao(10000, parcelas));
});

test("navegação pós-cartão persiste somente o resumo não sensível", () => {
  const memoria = new Map();
  const anterior = globalThis.sessionStorage;
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: {
    getItem: chave => memoria.get(chave) ?? null,
    setItem: (chave, valor) => memoria.set(chave, valor),
  } });
  try {
    salvarPagamentoParaTela({
      id: "axxon_teste", pedido: "234051", total: 1000, metodo: "cartao", confirmado: true,
      cartao: cartaoTeste, email: "cliente@example.com",
    });
    const bruto = memoria.get(CHAVE_PAGAMENTO);
    assert.doesNotMatch(bruto, /4111|123|cliente@example/);
    assert.deepEqual(lerPagamentoDaTela(), {
      id: "axxon_teste", pedido: "234051", total: 1000, metodo: "cartao", confirmado: true,
      qr_code: "", qr_code_url: null,
    });
  } finally {
    if (anterior === undefined) delete globalThis.sessionStorage;
    else Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: anterior });
  }
});

function rotaCartao({ origem = true, limite = false, gateways = { pix: "axxonpay", cartao: "axxonpay" }, processar } = {}) {
  const chamadas = [];
  const { POST } = modulo("../src/app/api/pagamentos/cartao/route.ts", {
    "@/lib/origem": { origemOficial: () => origem },
    "@/lib/limite": { excedeu: () => limite, ipDe: () => "127.0.0.1" },
    "@/lib/gateways-config": { lerGateways: async () => { if (gateways instanceof Error) throw gateways; return gateways; } },
    "@/lib/pagamentos-axxon": { processarAxxon: async (body, metodo) => { chamadas.push({ body, metodo }); return processar ? processar(body) : Response.json({ id: "axxon_x" }); } },
  });
  return { POST, chamadas };
}
const requisicao = (body, headers = {}) => new Request("https://loja.example/api/pagamentos/cartao", {
  method: "POST", headers: { "content-type": "application/json", origin: "https://loja.example", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body),
});
const corpoNaoLido = { headers: new Headers({ "content-type": "application/json" }), text() { throw new Error("Não deve ler o corpo"); } };

test("rota de cartão: origem, limite e seleção do gateway antes de ler o corpo", async () => {
  for (const [nome, opcoes, status] of [
    ["origem estranha", { origem: false }, 403],
    ["limite por IP", { limite: true }, 429],
    ["cartão desativado", { gateways: { pix: "axxonpay", cartao: "desativado" } }, 503],
    ["sandbox", { gateways: { pix: "pinpay", cartao: "sandbox" } }, 503],
    ["configuração indisponível", { gateways: new Error("banco") }, 503],
  ]) {
    const { POST, chamadas } = rotaCartao(opcoes);
    const r = await POST(corpoNaoLido);
    assert.equal(r.status, status, nome);
    assert.equal(r.headers.get("cache-control"), "no-store", nome);
    assert.equal(chamadas.length, 0, nome);
  }
  const { POST } = rotaCartao({ limite: true });
  assert.equal((await POST(corpoNaoLido)).headers.get("retry-after"), "60");
});
test("rota de cartão: corpo inválido, grande ou sem JSON não chega ao serviço", async () => {
  const { POST, chamadas } = rotaCartao();
  assert.equal((await POST(requisicao("{", {}))).status, 400);
  assert.equal((await POST(requisicao([1]))).status, 400);
  assert.equal((await POST(requisicao("null"))).status, 400);
  assert.equal((await POST(requisicao({ a: "x".repeat(17000) }))).status, 413);
  assert.equal((await POST(requisicao({ ok: true }, { "content-type": "text/plain" }))).status, 415);
  assert.equal(chamadas.length, 0);
});
test("rota de cartão: encaminha o corpo íntegro ao serviço e devolve a resposta dele", async () => {
  const { POST, chamadas } = rotaCartao({ processar: () => Response.json({ id: "axxon_1", nextAction: { type: "CLIENT_CONFIRMATION" } }, { status: 200 }) });
  const r = await POST(requisicao({ nome: "Cliente", cartao: cartaoTeste, installments: 2, tentativa: "t" }));
  assert.equal(r.status, 200);
  assert.equal((await r.json()).nextAction.type, "CLIENT_CONFIRMATION");
  assert.equal(chamadas.length, 1);
  assert.equal(chamadas[0].metodo, "cartao");
  assert.equal(JSON.stringify(chamadas[0].body.cartao), JSON.stringify(cartaoTeste));
  const { POST: falha } = rotaCartao({ processar: () => { throw new Error("segredo interno 4111"); } });
  const r2 = await falha(requisicao({ cartao: cartaoTeste }));
  assert.equal(r2.status, 503);
  assert.doesNotMatch(await r2.text(), /4111|segredo/);
});

function rotaConfig(gateways, adquirente) {
  let consultas = 0;
  const { GET } = modulo("../src/app/api/pagamentos/config/route.ts", {
    "@/lib/gateways-config": { lerGateways: async () => gateways },
    "@/lib/axxonpay": { configuracaoAdquirenteAxxon: async () => { consultas++; if (adquirente instanceof Error) throw adquirente; return adquirente; } },
    "@/lib/cartao": cartao,
  });
  return { GET, consultas: () => consultas };
}
test("configuração pública: chave só com cartão ativo e adquirente homologada", async () => {
  const ok = rotaConfig({ pix: "axxonpay", cartao: "axxonpay" }, { publica: "pk_teste", provider: "bloopi", modo: "cru" });
  const r = await ok.GET();
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.deepEqual(await r.json(), { pix: "axxonpay", cartao: "axxonpay", publicKey: "pk_teste", cartaoDisponivel: true, parcelas: cartao.PARCELAS_MAX });

  const recusada = rotaConfig({ pix: "pinpay", cartao: "axxonpay" }, new Error("não homologada"));
  assert.deepEqual(await (await recusada.GET()).json(), { pix: "pinpay", cartao: "desativado", publicKey: null, cartaoDisponivel: false, parcelas: cartao.PARCELAS_MAX });

  for (const [selecao, esperado] of [["desativado", "desativado"], ["sandbox", "sandbox"]]) {
    const r = rotaConfig({ pix: "axxonpay", cartao: selecao }, { publica: "pk_teste" });
    const dados = await (await r.GET()).json();
    assert.equal(dados.cartao, esperado); assert.equal(dados.publicKey, null); assert.equal(dados.cartaoDisponivel, false);
    assert.equal(r.consultas(), 0, "não consulta a adquirente sem cartão ativo");
  }
});

function rotaPainel({ adquirente, credencial } = {}) {
  const chamadas = [];
  const { POST } = modulo("../src/app/api/painel/gateways/route.ts", {
    "@/lib/painel-auth": { autenticado: async () => true },
    "@/lib/mesma-origem": { mesmaOrigem: () => true },
    "@/lib/gateways-config": { configGatewaysValida: () => true },
    "@/lib/config-integracoes": { salvar: async (...args) => { chamadas.push(["salvar", ...args]); } },
    "@/lib/axxonpay": {
      validarAxxon: async () => { chamadas.push(["validarAxxon"]); if (credencial instanceof Error) throw credencial; },
      configuracaoAdquirenteAxxon: async () => { chamadas.push(["adquirente"]); if (adquirente instanceof Error) throw adquirente; return adquirente; },
    },
    "@/lib/pinpay": { verificarCredencial: async () => { chamadas.push(["pinpay"]); } },
  });
  const enviar = config => POST(new Request("https://loja.example/api/painel/gateways", {
    method: "POST", headers: { origin: "https://loja.example", "content-type": "application/json" }, body: JSON.stringify(config),
  }));
  return { enviar, chamadas };
}
test("painel: ativa cartão só após validar credenciais e adquirente", async () => {
  const ok = rotaPainel({ adquirente: { publica: "pk", provider: "bloopi", modo: "cru" } });
  assert.equal((await ok.enviar({ pix: "pinpay", cartao: "axxonpay" })).status, 200);
  assert.deepEqual(ok.chamadas.map(c => c[0]), ["validarAxxon", "adquirente", "pinpay", "salvar"]);
  assert.equal(ok.chamadas.at(-1)[2], JSON.stringify({ pix: "pinpay", cartao: "axxonpay" }));

  const recusada = rotaPainel({ adquirente: new Error("Esta adquirente não está homologada para cartão nesta loja.") });
  const r = await recusada.enviar({ pix: "axxonpay", cartao: "axxonpay" });
  assert.equal(r.status, 503);
  assert.match((await r.json()).erro, /não está homologada/);
  assert.ok(!recusada.chamadas.some(c => c[0] === "salvar"), "seleção não é salva");

  const semCartao = rotaPainel();
  assert.equal((await semCartao.enviar({ pix: "axxonpay", cartao: "desativado" })).status, 200);
  assert.deepEqual(semCartao.chamadas.map(c => c[0]), ["validarAxxon", "salvar"]);
});

test("checkout: cartão em componente próprio, sem campos de cartão no formulário principal nem no rastreio", () => {
  const checkout = fonte("../src/components/sites/cafecomdeuspai-com-8456844d/checkout/CheckoutCafe.tsx");
  assert.match(checkout, /import CartaoAxxon from "@\/components\/pagamentos\/CartaoAxxon"/);
  assert.match(checkout, /cartaoDisponivel && gatewayConfig\?\.publicKey/);
  assert.match(checkout, /onFalha=\{mostrarOfertaPix\}/, "falha do cartão oferece recuperação por Pix");
  assert.match(checkout, /Continue sua compra pelo Pix com desconto aplicado automaticamente/);
  assert.match(checkout, /Embrulhar para presente/);
  assert.match(checkout, /Dedicatória escrita por Junior Rostirola/);
  assert.match(checkout, /classeBotao=\{styles\.payButton\}/, "cartão usa o mesmo botão visual do Pix");
  assert.match(checkout, /Cartão processado pela/);
  assert.match(checkout, /cielo-logo\.svg/);
  assert.doesNotMatch(checkout, /cc-number|cc-csc|cvv|numeroCartao|\/api\/pagamentos\/cartao|cartao-sandbox|chaveAtivacao/);
  assert.match(checkout, /fetch\("\/api\/pix"/);
  const componente = fonte("../src/components/pagamentos/CartaoAxxon.tsx");
  assert.match(componente, /identificarBandeiraCartao/);
  assert.match(componente, /Processando seu cartão/);
  assert.match(componente, /Abrindo a segurança do banco/);
  assert.match(componente, /"Finalizar compra"/);
  assert.match(componente, /\{seloProcessador\}/);
  assert.doesNotMatch(componente, /`Pagar \$\{money\.format/);
  assert.match(componente, /onFalha\?\.\(\)/);
  assert.match(componente, /podeOferecerPix/, "não oferece Pix em falha ambígua que ainda pode cobrar");
  assert.match(componente, /bloopi:3ds-state/, "acompanha se o desafio bancário chegou a abrir");
  assert.match(componente, /fase: etapa3ds/, "falha 3DS registra somente uma fase fechada, sem dados do cartão");
  assert.doesNotMatch(componente, /binlist|lookup\.binlist|api\.card/);
  for (const exigido of [/useRef<HTMLInputElement>/, /autoComplete="cc-number"/, /autoComplete="cc-csc"/, /type="password"/, /fetch\("\/api\/pagamentos\/cartao"/, /handleNextAction\(/, /form\.current\?\.reset\(\)/, /acompanharPix\(/, /salvarPagamentoParaTela\(/, /router\.replace\("\/pagamento"\)/, /https:\/\/app\.axxonpay\.com\.br\/v1\/js\/sdk\.js/]) {
    assert.match(componente, exigido);
  }
  assert.doesNotMatch(componente, /console\.|localStorage|sessionStorage\.setItem|setNumero|setCvv|setValidade|setTitular/, "cartão nunca vai a state, storage ou console");
  assert.doesNotMatch(componente, /status === "approved"[^;]*\bnextAction|setStatus\("approved"\)/, "aprovação só pela consulta ao servidor");
});

test("CSP: hosts de 3DS só no checkout; o resto do site continua fechado", () => {
  const config = fonte("../next.config.ts");
  const [, basico] = /const base: Record<string, string> = \{([\s\S]*?)\n    \};/.exec(config);
  const [, checkout] = /const cspCheckout = montar\(\{([\s\S]*?)\n    \}\);/.exec(config);
  for (const host of ["app.bloopi.io", "api.bloopi.io", "static.safe2pay.dev", "3ds-nx-js.stone.com.br", "assets.pagseguro.com.br", "cdn.marlim.co", "*.online-metrix.net", "cardinalcommerce.com"]) {
    assert.doesNotMatch(basico, new RegExp(host.replace(/[.*]/g, c => `\\${c}`)), `${host} fora do checkout`);
    assert.match(checkout, new RegExp(host.replace(/[.*]/g, c => `\\${c}`)), `${host} no checkout`);
  }
  assert.match(checkout, /"frame-src": "https:"/);
  assert.match(checkout, /"form-action": "'self' https:"/, "Cardinal pode postar o desafio na URL ACS do emissor");
  assert.doesNotMatch(checkout, /"frame-ancestors"|"script-src": "'self' 'unsafe-inline' 'unsafe-eval' https:"/, "herda frame-ancestors 'none' e não abre script-src");
  assert.match(config, /source: "\/checkout\/:path\*", headers: \[\{ key: "Content-Security-Policy", value: cspCheckout \}\]/);
  assert.match(config, /source: "\/api\/pagamentos\/config"[\s\S]*?"Cache-Control", value: "no-store, max-age=0"/, "a configuração do cartão não pode ficar obsoleta no navegador");
});

test("proxy do SDK Bloopi usa somente a origem pública ativa", () => {
  const rota = fonte("../src/app/api/pagamentos/sdk/bloopi/route.ts");
  assert.match(rota, /https:\/\/app\.bloopi\.io\/bloopi\.js/);
  assert.doesNotMatch(rota, /https:\/\/js\.bloopi\.io/, "não espera oito segundos por um host sem DNS");
  assert.match(rota, /bloopi-leitura\/checkout-config/);
  assert.match(rota, /bloopi-leitura\/get-checkout-info/);
  assert.match(rota, /bloopi-envio\/initiate-3ds/);
  assert.match(rota, /bloopi-envio\/confirm-payment/);
  assert.match(rota, /safe2PayReady/);
  assert.match(rota, /existingScript\.remove\(\)/, "MPI incompleto é removido antes da tentativa seguinte");
  const leitura = fonte("../src/app/api/pagamentos/bloopi-leitura/[...path]/route.ts");
  assert.match(leitura, /export async function GET/);
  assert.doesNotMatch(leitura, /export async function POST/, "a rota idempotente continua exclusiva para leitura");
  const envio = fonte("../src/app/api/pagamentos/bloopi-envio/[path]/route.ts");
  assert.match(envio, /export async function POST/);
  assert.doesNotMatch(envio, /for \(let tentativa|await esperar|while \(/, "POST mutável nunca é repetido automaticamente");
});

test("leituras Bloopi: somente GET permitido, com repetição segura e sem cache", async () => {
  const chamadas = [];
  let respostas = 0;
  const { GET } = modulo("../src/app/api/pagamentos/bloopi-leitura/[...path]/route.ts", {
    "@/lib/origem": { origemOficial: () => true },
    "@/lib/limite": { excedeu: () => false, ipDe: () => "127.0.0.1" },
    $fetch: async (url, init) => {
      chamadas.push({ url, init });
      respostas++;
      if (respostas === 1) return Response.json({ error: "transitório" }, { status: 503 });
      return Response.json({ data: { ok: true } });
    },
  });
  const req = new Request("https://loja.example/api/pagamentos/bloopi-leitura/get-checkout-info/pi_teste", {
    headers: { origin: "https://loja.example", "x-public-key": "pk_teste", "x-checkout-secret": "segredo-ficticio" },
  });
  const resposta = await GET(req, { params: Promise.resolve({ path: ["get-checkout-info", "pi_teste"] }) });
  assert.equal(resposta.status, 200);
  assert.match(resposta.headers.get("cache-control"), /no-store/);
  assert.equal(chamadas.length, 2, "GET 503 é repetido uma única vez");
  assert.equal(chamadas[1].url, "https://api.bloopi.io/functions/v1/get-checkout-info/pi_teste");
  assert.equal(chamadas[1].init.headers.get("x-checkout-secret"), "segredo-ficticio");

  const antes = chamadas.length;
  const invalida = await GET(req, { params: Promise.resolve({ path: ["confirm-payment"] }) });
  assert.equal(invalida.status, 404);
  assert.equal(chamadas.length, antes, "rota mutável não chega à Bloopi");
});

test("envio Bloopi: repassa a mutação uma única vez e nunca registra o corpo", async () => {
  const chamadas = [];
  const { POST } = modulo("../src/app/api/pagamentos/bloopi-envio/[path]/route.ts", {
    "@/lib/origem": { origemOficial: () => true },
    "@/lib/limite": { excedeu: () => false, ipDe: () => "127.0.0.1" },
    $fetch: async (url, init) => {
      chamadas.push({ url, init });
      return Response.json({ data: { session_id: "sessao_teste" } });
    },
  });
  const corpo = JSON.stringify({ payment_intent_id: "pi_teste", checkout_secret: "segredo-ficticio" });
  const req = new Request("https://loja.example/api/pagamentos/bloopi-envio/initiate-3ds", {
    method: "POST",
    headers: { origin: "https://loja.example", "content-type": "application/json", "x-public-key": "pk_teste", "x-checkout-secret": "segredo-ficticio" },
    body: corpo,
  });
  const resposta = await POST(req, { params: Promise.resolve({ path: "initiate-3ds" }) });
  assert.equal(resposta.status, 200);
  assert.equal(chamadas.length, 1);
  assert.equal(chamadas[0].url, "https://api.bloopi.io/functions/v1/initiate-3ds");
  assert.equal(chamadas[0].init.body, corpo);
  assert.equal(chamadas[0].init.headers["x-checkout-secret"], "segredo-ficticio");

  const fonteEnvio = fonte("../src/app/api/pagamentos/bloopi-envio/[path]/route.ts");
  assert.doesNotMatch(fonteEnvio, /console\.|JSON\.stringify\(json\)|JSON\.stringify\(corpo\)/, "dados do envio não entram em log nem são serializados de novo");
});

test("envio Bloopi: falha de rede não repete uma confirmação", async () => {
  let chamadas = 0;
  const { POST } = modulo("../src/app/api/pagamentos/bloopi-envio/[path]/route.ts", {
    "@/lib/origem": { origemOficial: () => true },
    "@/lib/limite": { excedeu: () => false, ipDe: () => "127.0.0.1" },
    $fetch: async () => { chamadas++; throw new Error("rede simulada"); },
  });
  const req = new Request("https://loja.example/api/pagamentos/bloopi-envio/confirm-payment", {
    method: "POST",
    headers: { "content-type": "application/json", "x-public-key": "pk_teste", "x-checkout-secret": "segredo-ficticio" },
    body: JSON.stringify({ session_id: "sessao_teste", checkout_secret: "segredo-ficticio" }),
  });
  const resposta = await POST(req, { params: Promise.resolve({ path: "confirm-payment" }) });
  assert.equal(resposta.status, 502);
  assert.equal(chamadas, 1, "confirmação incerta não é reenviada");
});
