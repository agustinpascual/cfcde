import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const fonte = readFileSync(new URL("../src/components/sites/cafecomdeuspai-com-8456844d/checkout/CheckoutCafe.tsx", import.meta.url), "utf8");
const inicio = fonte.indexOf("  async function generatePix() {");
const fim = fonte.indexOf("\n  async function copyPix()", inicio);
const gerarPix = fonte.slice(inicio, fim);

test("checkout aquece a página definitiva do Pix", () => {
  assert.match(fonte, /router\.prefetch\("\/pagamento"\)/);
});

test("checkout mostra a Stone como processadora ao selecionar Pix", () => {
  assert.match(fonte, /Pix processado por/);
  assert.match(fonte, /stone\.webp/);
});

test("resposta do gateway navega sem espera artificial nem QR intermediário", () => {
  assert.ok(inicio >= 0 && fim > inicio, "fluxo generatePix não encontrado");
  assert.doesNotMatch(gerarPix, /await new Promise|setTimeout\(resolve/);

  const persistir = gerarPix.indexOf("salvarPagamentoParaTela({");
  const navegar = gerarPix.indexOf('router.push("/pagamento")');
  const fallback = gerarPix.indexOf("setPixCharge(data)");
  assert.ok(persistir >= 0 && persistir < navegar, "o pagamento deve ser persistido antes da navegação");
  assert.ok(navegar < fallback, "o QR no checkout deve existir somente como fallback de storage");
});

test("clique duplo não dispara duas cobranças Pix", () => {
  assert.match(gerarPix, /if \(geracaoPixEmAndamento\.current\) return;/);
  assert.match(gerarPix, /geracaoPixEmAndamento\.current = true;/);
  assert.match(gerarPix, /finally \{[\s\S]*geracaoPixEmAndamento\.current = false;/);
});
