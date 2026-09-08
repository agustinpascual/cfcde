import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as protocolo from "../src/lib/axxonpay-protocolo.ts";

// Executa o serviço real transpilado, com banco/gateway/e-mails substituídos.
// Não usa credenciais, rede, pedidos reais ou cartões de clientes.
function ambiente({ criar, erroReserva = false } = {}) {
  const pedidos = new Map();
  let chamadas = 0, consultas = 0, confirmacoes = 0;
  const gateway = {
    configuracaoAdquirenteAxxon: async () => ({ publica: "pk_teste", provider: "stripe" }),
    criarPagamentoAxxon: async dados => {
      chamadas++;
      return criar ? criar(dados) : { id: "payment_uuid", amount: dados.amount, status: "PENDING", paymentMethod: dados.paymentMethod, metadata: dados.metadata, qrCode: "PIX-FICTICIO" };
    },
    consultarPagamentoAxxon: async id => {
      consultas++;
      const pedido = [...pedidos.values()].find(p => p.pix_id === `axxon_${id}`);
      return { id, amount: pedido.valor_centavos, status: "PENDING", method: pedido.metodo_pagamento === "pix" ? "pix" : "credit_card", metadata: { external_reference: pedido.referencia } };
    },
  };
  class Consulta {
    filtros = []; payload = null;
    select() { return this; }
    eq(campo, valor) { this.filtros.push(p => p[campo] === valor); return this; }
    is(campo, valor) { this.filtros.push(p => (p[campo] ?? null) === valor); return this; }
    update(payload) { this.payload = payload; return this; }
    async insert(payload) {
      if (erroReserva) return { error: { code: "db_offline" } };
      if (pedidos.has(payload.referencia)) return { error: { code: "23505" } };
      pedidos.set(payload.referencia, { ...payload, pix_id: null });
      return { error: null };
    }
    async maybeSingle() {
      const p = [...pedidos.values()].find(p => this.filtros.every(f => f(p)));
      if (p && this.payload) Object.assign(p, this.payload);
      return { data: p ? { ...p } : null, error: null };
    }
    then(resolve, reject) { return this.maybeSingle().then(resolve, reject); }
  }
  const dependencias = {
    "server-only": {}, "qrcode": { toDataURL: async () => "data:image/png;base64,TESTE" },
    "./supabase/servidor": { supabaseAdmin: () => ({ from: () => new Consulta() }) },
    "./axxonpay": gateway, "./axxonpay-protocolo": protocolo,
    "./precos": { calcularTotalCafe: () => ({ total: 2500, subtotal: 2500, desconto: 0, frete: { centavos: 0, nome: "PAC" }, kit: { nome: "Produto teste" } }) },
    "./confirmar-pedido": { depois: () => {}, confirmarPorEmail: async () => { confirmacoes++; }, registrarCompraNoPixel: async () => {}, enviarPixPorEmail: async () => {} },
    "./entrega-app": { entregarAcessoApp: async () => {} },
  };
  const fonte = readFileSync(new URL("../src/lib/pagamentos-axxon.ts", import.meta.url), "utf8");
  const js = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports, require: id => {
    if (!(id in dependencias)) throw new Error(`Dependência não simulada: ${id}`);
    return dependencias[id];
  }, Response, URL, AbortSignal, process: { env: { NEXT_PUBLIC_SITE_URL: "https://loja.example" } } });
  return { ...exports, pedidos, contadores: () => ({ chamadas, consultas, confirmacoes }) };
}
const body = {
  tentativa: "550e8400-e29b-41d4-a716-446655440000", loja: "cafecomdeuspai", produto: "teste", qtd: 1, frete: "pac",
  nome: "Cliente Ficticio", email: "teste@example.com", documento: "00000000000", celular: "11999999999",
  endereco: { logradouro: "Rua Teste", numero: "1", bairro: "Centro", localidade: "Cidade", uf: "SP", cep: "00000000" },
};

test("duas requisições simultâneas criam somente uma cobrança", async () => {
  const a = ambiente();
  const resultados = await Promise.all([a.processarAxxon(body, "pix"), a.processarAxxon(body, "pix")]);
  assert.equal(a.contadores().chamadas, 1);
  assert.equal(resultados[0].status, 200);
  assert.ok([200, 409].includes(resultados[1].status));
  assert.equal(a.pedidos.size, 1);
});
test("timeout não provoca repetição nem fallback", async () => {
  const a = ambiente({ criar: async () => { throw new Error("timeout"); } });
  assert.equal((await a.processarAxxon(body, "pix")).status, 503);
  assert.equal((await a.processarAxxon(body, "pix")).status, 409);
  assert.equal(a.contadores().chamadas, 1);
});
test("banco indisponível impede cobrança órfã", async () => {
  const a = ambiente({ erroReserva: true });
  assert.equal((await a.processarAxxon(body, "pix")).status, 503);
  assert.equal(a.contadores().chamadas, 0);
});
test("cartão bruto é rejeitado antes de gravar ou chamar gateway", async () => {
  const a = ambiente();
  assert.equal((await a.processarAxxon({ ...body, card: { number: "TESTE" }, cardHash: "tok_teste" }, "cartao")).status, 400);
  assert.equal(a.contadores().chamadas, 0);
  assert.equal(a.pedidos.size, 0);
});
test("somente o hash segue para o gateway e nunca para o banco", async () => {
  let enviado;
  const a = ambiente({ criar: async p => { enviado = p; return { id: "payment_uuid", amount: 2500, status: "PENDING", paymentMethod: "credit_card" }; } });
  assert.equal((await a.processarAxxon({ ...body, cardHash: "tok_ficticio", installments: 2, amount: 1 }, "cartao")).status, 200);
  assert.equal(enviado.amount, 2500);
  assert.equal(enviado.card.hash, "tok_ficticio");
  assert.doesNotMatch(JSON.stringify([...a.pedidos.values()]), /tok_ficticio|cardHash/);
});
test("aprovação repetida é idempotente e evento antigo não desfaz aprovação/estorno", async () => {
  const a = ambiente();
  await a.processarAxxon(body, "pix");
  const p = { id: "payment_uuid", amount: 2500, status: "PAID", method: "pix" };
  await a.sincronizarAxxon(p);
  await a.sincronizarAxxon(p);
  await a.sincronizarAxxon({ ...p, status: "PENDING" });
  assert.equal([...a.pedidos.values()][0].status, "aprovado");
  assert.equal(a.contadores().confirmacoes, 1);
  await a.sincronizarAxxon({ ...p, status: "REFUNDED" });
  await a.sincronizarAxxon(p);
  assert.equal([...a.pedidos.values()][0].status, "estornado");
  assert.equal(a.contadores().confirmacoes, 1);
});
