import test from "node:test";
import assert from "node:assert/strict";
import { chromium, devices } from "playwright";

const base = process.env.HOME_TEST_BASE_URL;
if (base && !["127.0.0.1", "localhost"].includes(new URL(base).hostname)) throw new Error("Use o build local.");

for (const [nome, aparelho, formato] of [["celular", "Pixel 7", "mobile"], ["tablet", "Galaxy Tab S4", "desktop"]]) {
  test(`home ${nome}: banner antecipado, vídeo adiado e navegação preservada`, { skip: !base && "defina HOME_TEST_BASE_URL" }, async () => {
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext({ ...devices[aparelho], serviceWorkers: "block" });
      await context.addInitScript(() => { navigator.sendBeacon = () => true; });
      await context.route("**/*", route => {
        const req = route.request();
        if (new URL(req.url()).origin !== base) return route.abort();
        if (req.method() !== "GET") return route.fulfill({ json: { ok: true } });
        return route.continue();
      });
      const page = await context.newPage();
      const erros = [];
      page.on("pageerror", erro => erros.push(erro.message));
      await page.goto(base, { waitUntil: "networkidle" });
      const hero = page.getByRole("img", { name: /^Você faz parte desta história/ });
      await hero.waitFor();
      await page.waitForFunction(() => {
        const img = [...document.images].find(i => i.alt.startsWith("Você faz parte"));
        return img?.complete && img.naturalWidth > 0;
      });
      const src = await hero.evaluate(img => img.currentSrc);
      assert.match(src, new RegExp(`/hero-${formato}-v4\\.avif$`));
      const recursos = await page.evaluate(() => performance.getEntriesByType("resource").map(r => ({
        url: r.name, tipo: r.initiatorType, inicio: r.startTime, fim: r.responseEnd,
      })));
      const banner = recursos.find(r => r.url === src);
      assert.equal(banner?.tipo, "link", "banner começa pelo preload no HTML");
      assert.equal(recursos.filter(r => /hero-(mobile|desktop)-v4/.test(r.url)).length, 1, "baixa só a versão da tela atual");
      assert.equal(recursos.some(r => /_next\/image.*asset-00[35]-v3/.test(r.url)), false, "banner não usa otimizador no VPS");
      const previa = recursos.find(r => r.url.includes("launcher-preview"));
      if (previa) assert.ok(previa.inicio >= banner.fim, "vídeo não disputa o download do banner");
      await page.getByRole("button", { name: /^Abrir stories em vídeo/ }).click();
      await page.getByRole("dialog", { name: "Story 1 de 7", exact: true }).waitFor();
      await page.getByRole("button", { name: "Fechar", exact: true }).click();
      await page.getByRole("button", { name: "Abrir sacola", exact: true }).click();
      await page.getByRole("heading", { name: "Sua sacola", exact: true }).waitFor();
      await page.getByRole("button", { name: "Fechar carrinho", exact: true }).last().click();
      await page.getByRole("link", { name: "Conheça", exact: true }).click();
      await page.waitForURL("**/produto/box-plus2027");
      assert.deepEqual(erros, [], "sem erros na home ou navegação");
    } finally { await browser.close(); }
  });
}
