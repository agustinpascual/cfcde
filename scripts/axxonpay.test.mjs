import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { conferirPagamentoAxxon, ehAxxon, idAxxon, idRemotoAxxon, lerPagamentoAxxon, statusAxxon } from "../src/lib/axxonpay-protocolo.ts";
import { tentativaPagamento, concluirTentativa, liberarTentativaEncerrada } from "../src/lib/tentativa-pagamento.ts";
import { urlWebhookAxxon } from "../src/lib/axxonpay-webhook.ts";

test("normaliza criação e consulta sem converter valores por suposição", () => {
  const p = { id: "payment_uuid", amount: 2500, status: "PENDING", paymentMethod: "pix" };
  assert.deepEqual(lerPagamentoAxxon({ data: p }), p);
  assert.deepEqual(lerPagamentoAxxon(p), p);
  for (const amount of [null, "2500", 25.5, -100, NaN, 0]) assert.throws(() => lerPagamentoAxxon({ ...p, amount }));
  assert.throws(() => lerPagamentoAxxon({ ...p, id: "../qualquer-rota" }));
});
test("3DS, processamento e estados desconhecidos não aprovam pedidos", () => {
  for (const status of ["PAID", "FINISHED", "succeeded", "APPROVED"]) assert.equal(statusAxxon(status), "approved");
  for (const status of ["CREATED", "PENDING", "processing", "requires_action", "DISPUTE_OPEN", "desconhecido"]) assert.equal(statusAxxon(status), "pending");
  assert.equal(statusAxxon("FAILED"), "failed");
  assert.equal(statusAxxon("REFUNDED"), "refunded");
});
test("gateway de origem permanece identificável depois de trocar o ativo", () => {
  assert.equal(idRemotoAxxon(idAxxon("payment_uuid")), "payment_uuid");
  assert.equal(ehAxxon("PIX123456789"), false);
  assert.equal(ehAxxon("550e8400-e29b-41d4-a716-446655440000"), false);
  assert.throws(() => idRemotoAxxon("axxon_../route"));
});
test("não aplica transação de outro pedido, valor ou método", () => {
  const pedido = { pix_id: "axxon_payment_uuid", referencia: "AXX-teste", valor_centavos: 2500, metodo_pagamento: "cartao" };
  const p = { id: "payment_uuid", amount: 2500, status: "PAID", method: "credit_card", metadata: { external_reference: "AXX-teste" } };
  assert.doesNotThrow(() => conferirPagamentoAxxon(p, pedido));
  assert.throws(() => conferirPagamentoAxxon({ ...p, amount: 25 }, pedido));
  assert.throws(() => conferirPagamentoAxxon({ ...p, id: "outro_uuid" }, pedido));
  assert.throws(() => conferirPagamentoAxxon({ ...p, method: "pix" }, pedido));
  assert.throws(() => conferirPagamentoAxxon({ ...p, metadata: { external_reference: "outro" } }, pedido));
});
test("reenvio reutiliza tentativa, e somente conclusão libera nova tentativa", () => {
  const banco = new Map();
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: {
    getItem: chave => banco.get(chave) ?? null, setItem: (chave, valor) => banco.set(chave, valor), removeItem: chave => banco.delete(chave),
  } });
  const inicial = tentativaPagamento("combo-plus", "cartao");
  assert.equal(tentativaPagamento("combo-plus", "cartao"), inicial);
  assert.notEqual(tentativaPagamento("combo-plus", "pix"), inicial);
  concluirTentativa("combo-plus", "cartao");
  assert.notEqual(tentativaPagamento("combo-plus", "cartao"), inicial);
  delete globalThis.sessionStorage;
});
test("endpoint antigo não lê body nem grava cartão", async () => {
  const { POST } = await import("../src/app/api/cartao-sandbox/route.ts");
  const r = await POST();
  assert.equal(r.status, 410);
  const fonte = readFileSync(new URL("../src/app/api/cartao-sandbox/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(fonte, /supabase|\.json\(\)|\.text\(\)|console\./);
});
test("navegador só libera tentativa encerrada, sem apagar identificador mais recente", () => {
  const banco = new Map();
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: {
    getItem: chave => banco.get(chave) ?? null, setItem: (chave, valor) => banco.set(chave, valor), removeItem: chave => banco.delete(chave),
  } });
  try {
    const inicial = tentativaPagamento("teste", "pix");
    for (const resposta of [{}, { codigo: "TIMEOUT" }, { codigo: "DADOS_DIVERGENTES" }]) {
      assert.equal(liberarTentativaEncerrada("teste", "pix", inicial, resposta), false);
      assert.equal(tentativaPagamento("teste", "pix"), inicial);
    }
    const encerrada = { codigo: "TENTATIVA_ENCERRADA_SEM_COBRANCA" };
    assert.equal(liberarTentativaEncerrada("teste", "pix", inicial, encerrada), true);
    const nova = tentativaPagamento("teste", "pix");
    assert.notEqual(nova, inicial);
    assert.equal(liberarTentativaEncerrada("teste", "pix", inicial, encerrada), false);
    assert.equal(tentativaPagamento("teste", "pix"), nova);
  } finally { delete globalThis.sessionStorage; }
});
test("webhook exige HTTPS e mantém destino oficial quando não há override", () => {
  assert.equal(urlWebhookAxxon("https://loja.example"), "https://loja.example/api/webhooks/axxonpay");
  for (const destino of ["http://loja.example/hook", "https://user:senha@loja.example/hook", "https://loja.example/#hook", "inválido"]) {
    assert.throws(() => urlWebhookAxxon("https://loja.example", destino));
  }
  assert.throws(() => urlWebhookAxxon());
});
test("checkout não envia mais cartão ao simulador antigo", () => {
  const fonte = readFileSync(new URL("../src/components/sites/cafecomdeuspai-com-8456844d/checkout/CheckoutCafe.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(fonte, /cartao-sandbox|chaveAtivacao|chaveUsuario|Simulando recusa/);
});
