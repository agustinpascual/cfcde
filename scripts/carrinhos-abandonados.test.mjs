import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import crypto from "node:crypto";

const fonte = caminho => readFileSync(new URL(caminho, import.meta.url), "utf8");

function rotaTrack(erroEvento = null) {
  const chamadas = [];
  const db = {
    from(tabela) {
      return {
        async upsert() { chamadas.push(`${tabela}:upsert`); return { error: null }; },
        async insert() { chamadas.push(`${tabela}:insert`); return { error: erroEvento }; },
      };
    },
  };
  class NextResponse extends Response {
    static json(dados, init) { return Response.json(dados, init); }
  }
  const compilado = ts.transpileModule(fonte("../src/app/api/track/route.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compilado, {
    exports, Response, console,
    require(id) {
      if (id === "next/server") return { NextResponse };
      if (id === "@/lib/limite") return { excedeu: () => false, ipDe: () => "127.0.0.1" };
      if (id === "@/lib/corpo-json") return {
        ErroCorpo: class ErroCorpo extends Error {},
        lerJsonObjeto: req => req.json(),
      };
      if (id === "@/lib/supabase/servidor") return { supabaseAdmin: () => db };
      if (id === "@/lib/dispositivos") return { detectarDispositivo: () => "desktop" };
      throw new Error(`Dependência externa não autorizada: ${id}`);
    },
  });
  return { POST: exports.POST, chamadas };
}

const requisicao = () => new Request("https://loja.example/api/track", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ sessao: "sessao-teste", tipo: "checkout_parcial", pagina: "/checkout", dados: { etapa: "Contato" } }),
});

test("track só confirma o carrinho quando sessão e evento foram gravados", async () => {
  const ok = rotaTrack();
  const respostaOk = await ok.POST(requisicao());
  assert.equal(respostaOk.status, 200);
  assert.equal((await respostaOk.json()).ok, true);
  assert.deepEqual(ok.chamadas, ["sessoes:upsert", "eventos:insert"]);

  const falha = rotaTrack({ message: "falha simulada" });
  const respostaFalha = await falha.POST(requisicao());
  assert.equal(respostaFalha.status, 202);
  assert.deepEqual(await respostaFalha.json(), { ok: false, motivo: "evento_nao_registrado" });
});

test("checkout reenvia abandono e painel diferencia vazio de erro", () => {
  const rastreador = fonte("../src/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/Rastreador.tsx");
  assert.match(rastreador, /const enfileirado = navigator\.sendBeacon/);
  assert.match(rastreador, /if \(enfileirado\) return;\s*void fetch/);
  assert.match(rastreador, /export async function registrarConfirmado/);
  assert.match(rastreador, /for \(let tentativa = 0; tentativa < 2; tentativa\+\+\)/);

  const checkout = fonte("../src/components/sites/cafecomdeuspai-com-8456844d/checkout/CheckoutCafe.tsx");
  assert.match(checkout, /registrarConfirmado\("checkout_parcial"/);
  assert.match(checkout, /window\.addEventListener\("pagehide", enviarPendente\)/);
  assert.match(checkout, /document\.addEventListener\("visibilitychange", aoMudarVisibilidade\)/);

  const painel = fonte("../src/app/ioh3j4ciof3n3oic/pedidos/abandonados/page.tsx");
  assert.match(painel, /lerCarrinhosComEstado/);
  assert.match(painel, /role="alert"/);
  assert.match(painel, /!erro && carrinhos\.length === 0/);
});

test("link de recuperação é assinado, expira e não carrega dados pessoais na URL", () => {
  const compilado = ts.transpileModule(fonte("../src/lib/carrinho-recuperacao.ts"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compilado, {
    exports, Buffer,
    process: { env: { PAINEL_SENHA: "segredo-de-teste-seguro" } },
    require(id) {
      if (id === "server-only") return {};
      if (id === "node:crypto") return crypto;
      if (id === "@/components/painel/dados") return { lerCarrinhoAbandonado: async () => null };
      throw new Error(`Dependência externa não autorizada: ${id}`);
    },
  });

  const agora = Date.UTC(2026, 8, 9);
  const token = exports.criarTokenRecuperacaoCarrinho("sessao_teste_123", agora);
  assert.equal(typeof token, "string");
  assert.equal(exports.verificarTokenRecuperacaoCarrinho(token, agora), "sessao_teste_123");
  assert.equal(exports.verificarTokenRecuperacaoCarrinho(`${token}x`, agora), null);
  assert.equal(exports.verificarTokenRecuperacaoCarrinho(token, agora + 15 * 24 * 60 * 60 * 1000), null);
  assert.doesNotMatch(token, /cliente|telefone|cpf|email/i);
});

test("painel abre o detalhe e checkout lê o token somente do cookie HttpOnly", () => {
  const lista = fonte("../src/app/ioh3j4ciof3n3oic/pedidos/abandonados/page.tsx");
  const detalhe = fonte("../src/app/ioh3j4ciof3n3oic/pedidos/abandonados/[sessao]/page.tsx");
  const entrada = fonte("../src/app/checkout/recuperar/[token]/route.ts");
  const nextConfig = fonte("../next.config.ts");
  const checkoutPage = fonte("../src/app/checkout/page.tsx");
  const checkout = fonte("../src/components/sites/cafecomdeuspai-com-8456844d/checkout/CheckoutCafe.tsx");

  assert.match(lista, /ioh3j4ciof3n3oic\/pedidos\/abandonados\/\$\{encodeURIComponent\(c\.sessao\)\}/);
  assert.match(detalhe, /checkout\/recuperar\//);
  assert.match(entrada, /httpOnly: true/);
  assert.match(entrada, /Referrer-Policy", "no-referrer"/);
  assert.match(nextConfig, /\/checkout\/recuperar\/:path\*[\s\S]*Referrer-Policy[\s\S]*no-referrer/);
  assert.match(entrada, /\/checkout\?origem=recuperacao/);
  assert.doesNotMatch(checkoutPage, /params\.recuperar/);
  assert.match(checkoutPage, /COOKIE_RECUPERACAO_CARRINHO/);
  assert.match(checkoutPage, /lerCheckoutRecuperado\(token\)/);
  assert.match(checkout, /logradouro: address\.street/);
  assert.match(checkout, /itens: products\.map/);
  assert.match(checkout, /if \(prefill\) return/);
});
