import assert from "node:assert/strict";
import test from "node:test";
import { PRODUCTS } from "../src/components/sites/cafecomdeuspai-com-8456844d/shared/productCatalog.ts";
import { comboPlus, comboPlus2027, produtoTestes } from "../src/components/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/produto.ts";

const PRECOS_PROMOCIONAIS = new Map([
  ["cafe-com-deus-pai-vol-6-brochura-a-vida-que-voce-busca-esta-na-cura-que-voce-precisa", 6990],
  ["cafe-com-deus-pai-vol-6-brochura-a-vida-que-voce-busca-esta-na-cura-que-voce-precisa-caneca", 18990],
  ["2-canecas-cafe-com-deus-pai-vol-6", 16990],
  ["a-vida-que-voce-busca-esta-na-cura-que-voce-precisa-lata-alfajor-velutti-com-6-un-marca-texto", 11990],
  ["a-vida-que-voce-busca-esta-na-cura-que-voce-precisa-planner-marca-texto", 9990],
  ["planner-cafe-com-deus-pai-2025", 2990],
  ["a-vida-que-voce-busca-esta-na-cura-que-voce-precisa-cafe-com-deus-pai-brochura-vol-6-planner", 14990],
  ["2-livros-cafe-com-deus-pai-vol-6-brochura-2-canecas", 25990],
  ["combo-cafe-com-deus-pai-vol-6-brochura-lata-de-cafe-gourmet", 7890],
  ["combo-cafe-com-deus-pai-2026-brochura-ecobag-copo-250ml", 6990],
  ["cafe-com-deus-pai-2026-brochura-10-filtros-individuais", 4890],
  ["cafe-com-deus-pai-vol-7-brochura", 4990],
  ["cafe-com-deus-pai-vol-7-capa-dura-copo-250ml", 5990],
  ["cafe-com-deus-pai-vol-7-capa-dura-marca-texto", 5990],
  ["cafe-com-deus-pai-vol-7-brochura-livro-de-oracao-verde", 8990],
  ["cafe-com-deus-pai-vol-7-brochura-filtro-de-cafe", 4990],
  ["cafe-com-deus-pai-vol-7-brochura-caderno-de-anotacoes-marca-texto", 7490],
  ["livro-de-oracao-cafe-com-deus-pai-marrom", 2290],
  ["livro-de-oracao-cafe-com-deus-pai-verde", 2290],
  ["cafe-com-deus-pai-vol-7-brochura-livro-de-oracao-marrom-marca-texto", 9990],
  ["cafe-com-deus-pai-vol-7-brochura-livro-de-oracao-verde-marca-texto", 9990],
  ["cafe-com-deus-pai-vol-7-capa-dura-caderno-de-anotacoes", 7490],
  ["cafe-com-deus-pai-vol-7-capa-dura-livro-de-oracao-marrom", 9990],
  ["cafe-com-deus-pai-vol-7-capa-dura-livro-de-oracao-verde", 9990],
  ["cafe-com-deus-pai-vol-7-capa-dura-filtro-de-cafe", 5990],
  ["cafe-com-deus-pai-vol-7-capa-dura-caderno-de-anotacoes-marca-texto", 8490],
  ["cafe-com-deus-pai-vol-7-capa-dura-livro-de-oracao-marrom-marca-texto-combo577", 10990],
  ["cafe-com-deus-pai-vol-7-capa-dura-livro-de-oracao-verde-marca-texto", 10990],
  ["cafe-com-deus-pai-vol-7-capa-dura-a-vida-que-voce-busca-esta-na-cura-que-voce-precisa", 10490],
  ["cafe-com-deus-pai-vol-7-capa-dura-marca-texto-copo-250ml", 6990],
  ["cafe-com-deus-pai-kids-tempo-de-crescer", 5990],
  ["cafe-com-deus-pai-teens-aventuras-com-jesus1", 5990],
  ["cafe-com-deus-pai-vol-7-capa-dura-cafe-com-deus-pai-kids-e-tempo-de-crescer", 13990],
  ["cafe-com-deus-pai-vol-7-capa-dura-cafe-com-deus-pai-teens-aventuras-com-jesus", 13990],
  ["cafe-com-deus-pai-vol-7-capa-dura-livros-de-oracao-verde-e-marrom-caderno-de-anotacoes", 17990],
]);

const brl = (centavos) => `R$${(centavos / 100).toFixed(2).replace(".", ",")}`;

test("todos os produtos do catálogo recebem R$30 de desconto e exibem o preço anterior", () => {
  assert.equal(PRODUCTS.length, PRECOS_PROMOCIONAIS.size);

  for (const product of PRODUCTS) {
    const esperado = PRECOS_PROMOCIONAIS.get(product.slug);
    assert.notEqual(esperado, undefined, product.slug);
    assert.equal(product.priceCents, esperado, product.slug);
    assert.equal(product.price, brl(esperado), product.slug);
    assert.equal(product.originalPrice, brl(esperado + 3000), product.slug);
    assert.equal(product.installment, `4 de ${brl(Math.round(esperado / 4))}`, product.slug);
  }
});

test("Combo Plus antigo recebe desconto, enquanto Box 2027 e homologação não mudam", () => {
  assert.deepEqual(comboPlus.ofertas, [
    { unidades: 1, rotulo: "1 unidade", preco: 259.9, comparado: 289.9, slug: "combo-plus" },
  ]);
  assert.deepEqual(comboPlus2027.ofertas, [
    { unidades: 1, rotulo: "1 unidade", preco: 89.9, comparado: 289.9, slug: "combo-plus2027" },
    { unidades: 2, rotulo: "2 unidades", preco: 129.9, comparado: 579.8, slug: "combo-plus2027-2un" },
  ]);
  assert.equal(produtoTestes.ofertas[0].preco, 10);
});
