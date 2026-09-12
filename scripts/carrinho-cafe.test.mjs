import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as promocoes from "../src/lib/promocoes.ts";

const fonte = readFileSync(new URL("../src/lib/precos.ts", import.meta.url), "utf8");
const js = ts.transpileModule(fonte, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const exports = {};
vm.runInNewContext(js, { exports, require: id => {
  if (id === "server-only") return {};
  if (id === "./promocoes") return promocoes;
  if (id === "@/components/sites/cafecomdeuspai-com-8456844d/shared/productCatalog") return { PRODUCTS: [] };
  throw new Error(`Dependência inesperada: ${id}`);
} });

test("carrinho soma produtos distintos e recalcula Pix no servidor", () => {
  const valores = exports.calcularCarrinhoCafe([
    { produto: "combo-plus2027", qtd: 2 },
    { produto: "combo-plus", qtd: 1 },
  ], "pac", { pagamento: "pix" });
  assert.equal(valores.subtotal, 46970);
  assert.equal(valores.quantidadeTotal, 3);
  assert.equal(valores.total, 44600);
  assert.equal(valores.itens.length, 2);
});

test("cupom de produto desconta só as linhas elegíveis da sacola", () => {
  const valores = exports.calcularCarrinhoCafe([
    { produto: "combo-plus2027", qtd: 2 },
    { produto: "combo-plus", qtd: 1 },
  ], "pac", { pagamento: "cartao", cupom: "CAFECOMDEUS27" });
  assert.equal(valores.descontoCupom, 719);
  assert.equal(valores.total, 46251);
});

test("cupom de saída do checkout aplica o desconto da Box 2027 no servidor", () => {
  const valores = exports.calcularCarrinhoCafe([
    { produto: "combo-plus2027", qtd: 1 },
  ], "pac", { pagamento: "cartao", cupom: "CAFECOMDEUSPAI27" });
  assert.equal(valores.descontoCupom, 360);
  assert.equal(valores.total, 8630);
});

test("order bumps têm preço fixo no servidor e recebem o desconto do Pix", () => {
  const cartao = exports.calcularCarrinhoCafe([
    { produto: "combo-plus2027", qtd: 1 },
  ], "pac", { pagamento: "cartao", adicionais: ["embrulho_presente", "dedicatoria_junior"] });
  assert.equal(cartao.subtotal, 11470);
  assert.equal(cartao.total, 11470);
  assert.equal(cartao.itens.length, 3);

  const pix = exports.calcularCarrinhoCafe([
    { produto: "combo-plus2027", qtd: 1 },
  ], "pac", { pagamento: "pix", adicionais: ["embrulho_presente", "dedicatoria_junior"] });
  assert.equal(pix.total, 10800);
  assert.throws(() => exports.calcularCarrinhoCafe([{ produto: "combo-plus2027", qtd: 1 }], "pac", { adicionais: ["preco_inventado"] }));
});

test("carta é normalizada e só existe junto do embrulho", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(exports.lerOrderBumpsCheckout({
    embrulho_presente: true, carta_ativa: true, carta_titulo: "  Com carinho  ", carta_texto: "  Mensagem  ",
  }))), {
    adicionais: ["embrulho_presente"],
    registro: { embrulho_presente: true, carta: { titulo: "Com carinho", texto_principal: "Mensagem" } },
  });
  assert.throws(() => exports.lerOrderBumpsCheckout({ carta_ativa: true, carta_titulo: "Título", carta_texto: "Texto" }));
  assert.throws(() => exports.lerOrderBumpsCheckout({ embrulho_presente: true, carta_ativa: true, carta_titulo: "", carta_texto: "Texto" }));
});

test("carrinho rejeita preço inventado, produto desconhecido e excesso", () => {
  assert.throws(() => exports.calcularCarrinhoCafe([{ produto: "inexistente", qtd: 1, preco: 1 }], "pac"));
  assert.throws(() => exports.calcularCarrinhoCafe([{ produto: "combo-plus", qtd: 21 }], "pac"));
  assert.throws(() => exports.calcularCarrinhoCafe([{ produto: "combo-plus", qtd: 1 }], "frete-inventado"));
});
