import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const fonte = readFileSync(new URL("../src/components/sites/cafecomdeuspai-com-8456844d/shared/ExitOffer.tsx", import.meta.url), "utf8");

test("oferta de saída não possui disparo por tempo", () => {
  assert.doesNotMatch(fonte, /setTimeout|setInterval|CARENCIA_MS/);
});

test("desktop exige ponteiro real no conteúdo antes de sair pelo topo", () => {
  assert.match(fonte, /pointerType === "mouse"/);
  assert.match(fonte, /clientY > 80/);
  assert.match(fonte, /clientY <= 0 && !evento\.relatedTarget/);
  assert.match(fonte, /mouseDentroDoConteudo/);
});

test("mobile abre apenas no evento de voltar e não em rolagem ou toque", () => {
  assert.match(fonte, /\(pointer: coarse\)/);
  assert.match(fonte, /addEventListener\("popstate", aoVoltar\)/);
  assert.doesNotMatch(fonte, /touchstart|touchmove|scroll/);
});
