import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as protocolo from "../src/lib/axxonpay-protocolo.ts";

const rejeicao = "customer.document: O número do documento (CPF/CNPJ) é inválido.";
function clienteSimulado(fetch) {
  const deps = { "server-only": {}, "./config-integracoes": { ler: async () => "credencial-ficticia" }, "./axxonpay-protocolo": protocolo };
  const fonte = readFileSync(new URL("../src/lib/axxonpay.ts", import.meta.url), "utf8");
  const js = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports, AbortSignal, fetch, require: id => {
    if (!(id in deps)) throw new Error(`Dependência não simulada: ${id}`);
    return deps[id];
  } });
  return exports;
}

test("contrato HTTP: envia centavos e webhook, consulta converte reais para centavos", async () => {
  const chamadas = [];
  const api = clienteSimulado(async (url, init) => {
    chamadas.push({ url, init });
    if (init.method === "POST") return Response.json({ data: { id: "payment_uuid", amount: 123, status: "PENDING" } }, { status: 201 });
    return Response.json({ id: "payment_uuid", amount: 123, currency: "BRL", status: "PENDING", method: "pix", qrCode: "PIX-FICTICIO" });
  });
  const postbackUrl = "https://webhooks.loja.example/api/webhooks/axxonpay";
  const criado = await api.criarPagamentoAxxon({ amount: 12300, paymentMethod: "pix", postbackUrl });
  assert.equal(criado.id, "payment_uuid");
  assert.equal(criado.amount, 123, "valor bruto da criação fica disponível para comparação estrita");
  assert.equal(criado.qrCode, undefined, "resposta incompleta continua exigindo GET canônico");
  const p = await api.consultarPagamentoAxxon(criado.id);
  assert.equal(p.amount, 12300);
  assert.equal(p.qrCode, "PIX-FICTICIO");
  assert.equal(chamadas.length, 2);
  assert.equal(JSON.parse(chamadas[0].init.body).amount, 12300);
  assert.equal(JSON.parse(chamadas[0].init.body).postbackUrl, postbackUrl);
  assert.equal(chamadas[1].url, "https://api.axxonpay.com.br/api/v1/payments/payment_uuid");
});

test("consulta real de cartão (09/09/2026): method card, reais em BRL, sem metadata", async () => {
  const api = clienteSimulado(async () => Response.json({ id: "payment_uuid", paymentLinkId: "link_uuid", purchaser: "bloopi", method: "card", amount: 10, currency: "BRL",
    status: "PENDING", qrCode: null, pixCopyPaste: null, pix: null, createdAt: "2026-09-09T05:21:33.358Z", expiresAt: "2026-09-09T06:21:35.423Z", confirmedAt: null,
    paymentLink: { id: "link_uuid", hash: "link-x", description: "Pedido #305591", amount: 10, successPageConfig: null } }));
  const p = await api.consultarPagamentoAxxon("payment_uuid");
  assert.equal(p.amount, 1000);
  assert.equal(p.method, "card");
  assert.equal(p.metadata, undefined);
  assert.doesNotThrow(() => protocolo.conferirPagamentoAxxon(p, { pix_id: "axxon_payment_uuid", referencia: "305591", valor_centavos: 1000, metodo_pagamento: "cartao" }));
});

test("configuração pública da adquirente usa cache curto no mesmo worker", async () => {
  let chamadas = 0;
  const api = clienteSimulado(async () => {
    chamadas++;
    return Response.json({ provider: "bloopi" });
  });
  assert.equal((await api.configuracaoAdquirenteAxxon()).modo, "cru");
  assert.equal((await api.configuracaoAdquirenteAxxon()).provider, "bloopi");
  assert.equal(chamadas, 1);
});

for (const campos of [{ id: "outro_uuid" }, { currency: "USD" }, { amount: 1.999 }]) {
  test(`consulta recusa contrato divergente: ${JSON.stringify(campos)}`, async () => {
    const api = clienteSimulado(async () => Response.json({ id: "payment_uuid", amount: 123, currency: "BRL", status: "PENDING", method: "pix", ...campos }));
    await assert.rejects(api.consultarPagamentoAxxon("payment_uuid"));
  });
}

for (const caso of [
  { status: 400, body: { errorMessage: rejeicao }, libera: true },
  { status: 400, body: { errorMessage: "Falha desconhecida" }, libera: false },
  { status: 400, body: { errorMessage: rejeicao, data: { id: "payment_uuid" } }, libera: false },
  { status: 500, body: { errorMessage: rejeicao }, libera: false },
  { status: 401, body: { errorMessage: rejeicao }, libera: false },
]) {
  test(`classifica rejeição sem expor corpo: HTTP ${caso.status}, libera=${caso.libera}, id=${!!caso.body.data}`, async () => {
    const deps = { "server-only": {}, "./config-integracoes": { ler: async () => "credencial-ficticia" }, "./axxonpay-protocolo": protocolo };
    const fonte = readFileSync(new URL("../src/lib/axxonpay.ts", import.meta.url), "utf8");
    const js = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {};
    let chamadas = 0;
    vm.runInNewContext(js, { exports, AbortSignal, require: id => {
      if (!(id in deps)) throw new Error(`Dependência não simulada: ${id}`);
      return deps[id];
    }, fetch: async () => { chamadas++; return Response.json(caso.body, { status: caso.status }); } });
    await assert.rejects(exports.chamarAxxon("/direct/payment", { method: "POST", body: "{}" }), erro => {
      assert.equal(Boolean(erro.documentoInvalido), caso.libera);
      assert.equal(erro.message, `AxxonPay respondeu HTTP ${caso.status}.`);
      return true;
    });
    assert.equal(chamadas, 1);
  });
}
