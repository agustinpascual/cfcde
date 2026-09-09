import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

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

  const painel = fonte("../src/app/painel/pedidos/abandonados/page.tsx");
  assert.match(painel, /lerCarrinhosComEstado/);
  assert.match(painel, /role="alert"/);
  assert.match(painel, /!erro && carrinhos\.length === 0/);
});
