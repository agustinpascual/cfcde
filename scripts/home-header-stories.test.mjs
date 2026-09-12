import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const raiz = new URL("../src/components/sites/cafecomdeuspai-com-8456844d/", import.meta.url);
const header = readFileSync(new URL("produtos-combo-plus-50ce9672/HeaderFooter.tsx", raiz), "utf8");
const headerCss = readFileSync(new URL("produtos-combo-plus-50ce9672/HeaderFooter.module.css", raiz), "utf8");
const hero = readFileSync(new URL("root-8a5edab2/HomeHero.tsx", raiz), "utf8");
const stories = readFileSync(new URL("root-8a5edab2/HomeVideoStories.tsx", raiz), "utf8");
const storiesCss = readFileSync(new URL("root-8a5edab2/HomeVideoStories.module.css", raiz), "utf8");
const commerce = readFileSync(new URL("root-8a5edab2/HomeCommerce.tsx", raiz), "utf8");
const store = readFileSync(new URL("root-8a5edab2/HomeStore.tsx", raiz), "utf8");
const lower = readFileSync(new URL("root-8a5edab2/HomeLower.tsx", raiz), "utf8");

test("cabeçalho da home fica fixo e troca para fundo branco ao rolar", () => {
  assert.match(header, /window\.scrollY > 24/);
  assert.match(header, /styles\.headerRolado/);
  assert.match(headerCss, /\.sobreposto\s*\{[^}]*position:fixed/);
  assert.match(headerCss, /\.header\.headerRolado\s*\{[^}]*background:#fff/);
});

test("faixa de confiança aparece logo depois da primeira imagem", () => {
  const fimHero = hero.indexOf("</section>");
  const faixa = hero.indexOf("styles.trustBar", fimHero);
  assert.ok(fimHero >= 0 && faixa > fimHero);
  for (const texto of ["Compra 100% segura", "Loja oficial", "Em até 4x sem juros no cartão"]) {
    assert.match(hero, new RegExp(texto, "i"));
  }
});

test("story pequeno continua tocando e acompanha a rolagem", () => {
  assert.match(stories, /muted autoPlay loop playsInline/);
  assert.match(stories, /launcher-preview\.m4v/, "a primeira dobra usa uma prévia leve em vez do story completo");
  assert.match(stories, /styles\.launcherFollowing/);
  assert.match(storiesCss, /\.launcherFollowing\{position:fixed/);
});

test("story flutuante pode ser arrastado e mantém somente o anel verde estático", () => {
  for (const evento of ["onPointerDown", "onPointerMove", "onPointerUp", "setPointerCapture"]) {
    assert.match(stories, new RegExp(evento));
  }
  assert.match(stories, /localStorage\.setItem\(POSICAO_LAUNCHER/);
  assert.match(storiesCss, /touch-action:none/);
  assert.match(storiesCss, /box-shadow:0 0 0 3px #20b879/);
  assert.match(storiesCss, /\.launcherMedia\{[^}]*border:0/);
  assert.doesNotMatch(storiesCss, /border:[^;}]*#fff/);
  assert.doesNotMatch(storiesCss, /launcherPulse/);
});

test("galeria troca automaticamente e abre os cards como stories sem botão de play", () => {
  assert.match(stories, /onEnded=\{offset === 0 \? avancar : undefined\}/);
  assert.match(stories, /onClick=\{\(\) => open\(index\)\}/);
  assert.match(stories, /<Link className=\{styles\.cta\} href="\/produto\/box-plus2027">Saiba mais<\/Link>/);
  assert.doesNotMatch(stories, /href="\/produtos\/combo-plus\/?"/);
  assert.doesNotMatch(stories, /styles\.play/);
  assert.doesNotMatch(storiesCss, /\.play\{/);
});

test("home remove Imperdível e usa somente kits novos em Destaques", () => {
  assert.doesNotMatch(commerce, /title="IMPERDÍVEL"/);
  assert.match(commerce, /const featured: Product\[\] = doCatalogo\.filter\(\(product\) => product\.name\.includes\("\+"\)\)/);
  assert.match(commerce, /<ProductRail title="DESTAQUES" products=\{featured\}/);
  assert.doesNotMatch(commerce, /PLANNER CAFÉ COM DEUS PAI|VOL\.6 \(BROCHURA\)/);
});

test("home adia carrinho e vídeos que ainda estão fora da tela", () => {
  assert.match(store, /dynamic\(\(\) => import\([^)]*CartDrawer/);
  assert.match(store, /cartOpen \? <CartDrawer open/);
  assert.match(lower, /rootMargin: "400px 0px"/);
  assert.match(stories, /rootMargin: "120px 0px"/);
});
