import assert from "node:assert/strict";
import test from "node:test";

const base = process.env.PRICE_TEST_BASE_URL;

test("vitrine mostra o preço anterior riscado junto do preço com desconto", { skip: !base && "defina PRICE_TEST_BASE_URL" }, async () => {
  const resposta = await fetch(base);
  assert.equal(resposta.status, 200);
  const html = await resposta.text();
  assert.match(
    html,
    /href="\/produtos\/cafe-com-deus-pai-vol-7-brochura"[\s\S]*?<del>R\$79,90<\/del><strong>R\$49,90<\/strong>/,
  );
});
