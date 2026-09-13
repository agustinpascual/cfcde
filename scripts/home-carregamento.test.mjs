import test from "node:test";
import assert from "node:assert/strict";
import { chromium, webkit, devices } from "playwright";

const base = process.env.HOME_TEST_BASE_URL;
if (base && !["127.0.0.1", "localhost"].includes(new URL(base).hostname)) throw new Error("Use o build local.");

test("home já mostra o banner no celular antes de baixar o JavaScript do React", { skip: !base && "defina HOME_TEST_BASE_URL" }, async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ ...devices["Pixel 7"], serviceWorkers: "block" });
    let escritas = 0;
    await context.route("**/*", route => {
      const req = route.request();
      if (new URL(req.url()).origin !== base) return route.abort();
      if (req.method() !== "GET") { escritas++; return route.abort(); }
      if (new URL(req.url()).pathname.endsWith(".js")) return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.getByRole("img", { name: /^Você faz parte desta história/ }).waitFor({ state: "visible" });
    await page.waitForFunction(() => {
      const img = document.querySelector('img[alt^="Você faz parte"]');
      return img?.complete && img.naturalWidth > 0;
    });
    assert.equal(escritas, 0, "exibir HTML não dispara rastreamento antes da liberação");
    assert.equal(await page.locator('html[data-cdp-acesso="liberado"]').count(), 1);
  } finally { await browser.close(); }
});

for (const [nome, aparelho, formato] of [["celular", "Pixel 7", "mobile"], ["tablet", "Galaxy Tab S4", "desktop"]]) {
  test(`home ${nome}: banner antecipado, vídeo adiado e navegação preservada`, { skip: !base && "defina HOME_TEST_BASE_URL" }, async () => {
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext({ ...devices[aparelho], serviceWorkers: "block" });
      let liberarScripts;
      const scriptsLiberados = new Promise(resolve => { liberarScripts = resolve; });
      await context.addInitScript(() => { navigator.sendBeacon = () => true; });
      await context.route("**/*", async route => {
        const req = route.request();
        if (new URL(req.url()).origin !== base) return route.abort();
        if (req.method() !== "GET") return route.fulfill({ json: { ok: true } });
        if (new URL(req.url()).pathname.endsWith(".js")) await scriptsLiberados;
        return route.continue();
      });
      const page = await context.newPage();
      const erros = [];
      page.on("pageerror", erro => erros.push(erro.message));
      await page.goto(base, { waitUntil: "commit" });
      const hero = page.getByRole("img", { name: /^Você faz parte desta história/ });
      await hero.waitFor();
      await page.waitForFunction(() => {
        const img = [...document.images].find(i => i.alt.startsWith("Você faz parte"));
        return img?.complete && img.naturalWidth > 0;
      });
      // Reproduz cache quente/JS lento: o onLoad já passou quando React monta.
      liberarScripts();
      await page.getByRole("button", { name: /^Abrir stories em vídeo/ }).waitFor();
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

for (const [aparelho, motor] of [["Pixel 7", chromium], ["Galaxy Tab S4", chromium], ["iPhone 13", webkit]]) {
  test(`vitrine ${aparelho}: baixa imagens próximas e carrega os demais produtos ao rolar`, { skip: !base && "defina HOME_TEST_BASE_URL" }, async () => {
    const browser = await motor.launch();
    let context;
    try {
      const origem = motor === webkit ? "https://vitrine-teste.invalid" : base;
      context = await browser.newContext({ ...devices[aparelho], serviceWorkers: "block" });
      await context.addInitScript(() => { navigator.sendBeacon = () => true; });
      await context.route("**/*", async route => {
        const req = route.request();
        const url = new URL(req.url());
        if (url.origin !== origem) return route.abort();
        if (req.method() !== "GET") return route.fulfill({ json: { ok: true, permitido: true } });
        if (origem !== base) return route.fulfill({ response: await route.fetch({
          url: `${base}${url.pathname}${url.search}`,
          headers: { ...req.headers(), host: url.host, "x-forwarded-host": url.host, "x-forwarded-proto": "https" },
        }) });
        return route.continue();
      });
      const page = await context.newPage();
      const erros = [];
      page.on("pageerror", erro => erros.push(erro.message));
      await page.goto(origem, { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: /^Abrir stories em vídeo/ }).waitFor();
      const vitrine = page.locator("section").filter({ has: page.getByRole("heading", { name: "LANÇAMENTO", exact: true }) });
      const produtos = vitrine.locator("a");
      assert.ok(await produtos.count() > 8, "catálogo inteiro continua acessível");
      assert.equal(await produtos.last().locator("img").count(), 0, "não baixa o último card fora da tela");
      const banner = page.getByRole("link", { name: "Conheça o Combo Plus 2027", exact: true });
      // No tablet alto o banner já pode estar na primeira tela e deve carregar.
      const posicao = await banner.boundingBox();
      if (posicao.y > page.viewportSize().height + 240) {
        assert.equal(await banner.locator("img").count(), 0, "banner longe da tela não disputa a abertura");
      }
      await produtos.first().scrollIntoViewIfNeeded();
      await produtos.first().locator("img").waitFor();
      await produtos.first().locator("img").evaluate(img => img.decode());
      await produtos.last().evaluate(link => link.parentElement.scrollTo({ left: link.parentElement.scrollWidth, behavior: "instant" }));
      await produtos.last().locator("img").waitFor();
      await produtos.last().locator("img").evaluate(img => img.decode());
      await banner.scrollIntoViewIfNeeded();
      await banner.locator("img").waitFor();
      await banner.locator("img").evaluate(img => img.decode());
      assert.ok(await banner.locator("img").evaluate(img => img.naturalWidth > 0));
      await banner.click();
      await page.waitForURL("**/produto/box-plus2027");
      await page.getByRole("button", { name: "Abrir sacola", exact: true }).waitFor();
      // A página de destino pode continuar baixando imagens; a home e suas
      // imagens já foram verificadas acima. Encerra o proxy antes do browser.
      await context.unrouteAll({ behavior: "ignoreErrors" });
      assert.deepEqual(erros, [], "imagens e navegação sem erros");
    } finally {
      await context?.unrouteAll({ behavior: "ignoreErrors" });
      await browser.close();
    }
  });
}
