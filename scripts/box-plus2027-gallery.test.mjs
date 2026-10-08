import assert from "node:assert/strict";
import test from "node:test";

const base = process.env.BOX_PLUS_TEST_BASE_URL ?? "http://localhost:3000";
const imagens = [
  "box-premium-2027-lancamento.webp",
  "box-premium-2027-completo.webp",
  "box-premium-2027-alca-detalhe-escuro.webp",
  "box-premium-2027-fechado.webp",
  "box-premium-2027-alca-detalhe-claro.webp",
  "box-premium-2027-itens.webp",
];

test("a página e o checkout usam a nova galeria oficial do Box Plus 2027", async () => {
  const resposta = await fetch(`${base}/produto/box-plus2027`);
  assert.equal(resposta.status, 200);
  const html = await resposta.text();

  for (const imagem of imagens) {
    assert.match(html, new RegExp(imagem));
    const arquivo = await fetch(`${base}/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/${imagem}`);
    assert.equal(arquivo.status, 200, imagem);
    assert.match(arquivo.headers.get("content-type") ?? "", /^image\/webp/);
  }

  assert.doesNotMatch(html, /box2027-1\.webp|box-livro-[1-4]\.webp/);
});
