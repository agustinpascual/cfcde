import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import config from "../next.config.ts";

const DESTINO = "/produto/box-plus2027";
const ESPERADOS = [
  "/boxlancamento",
  "/box-2027",
  "/combo2027",
  "/boxplus2027",
  "/box-plus-2027",
  "/combo-plus-2027",
  "/combo-plus2027",
  "/lancamento2027",
  "/lancamento-2027",
  "/box-cafe-com-deus-pai",
  "/box-cafe-com-deus-pai-2027",
  "/combo-cafe-com-deus-pai",
  "/combo-cafe-com-deus-pai-2027",
  "/cafe-com-deus-pai-2027",
  "/colecao2027",
  "/colecao-2027",
  "/colecao-cafe-com-deus-pai",
  "/nova-colecao-2027",
  "/box-volume-7",
  "/combo-volume-7",
  "/volume-7-2027",
  "/kit2027",
  "/kit-2027",
  "/kit-cafe-com-deus-pai",
];

test("expõe exatamente 24 aliases únicos para o Box Plus 2027", async () => {
  const rewrites = await config.rewrites();
  const aliases = rewrites.filter((rewrite) => rewrite.destination === DESTINO);

  assert.equal(aliases.length, 24);
  assert.deepEqual(aliases.map((rewrite) => rewrite.source), ESPERADOS);
  assert.equal(new Set(aliases.map((rewrite) => rewrite.source)).size, 24);

  for (const { source } of aliases) {
    assert.match(source, /^\/[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.notEqual(source, DESTINO);
  }
});

test("aliases não colidem com páginas, arquivos públicos ou outros rewrites", async () => {
  const rewrites = await config.rewrites();
  const redirects = await config.redirects();
  const sources = rewrites.map((rewrite) => rewrite.source);
  assert.equal(new Set(sources).size, sources.length);

  for (const source of ESPERADOS) {
    const relativo = source.slice(1);
    assert.equal(redirects.some((redirect) => redirect.source === source), false, source);
    assert.equal(existsSync(new URL(`../src/app/${relativo}`, import.meta.url)), false, source);
    assert.equal(existsSync(new URL(`../public/${relativo}`, import.meta.url)), false, source);
  }
});
