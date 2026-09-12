import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { chromium, webkit } from "playwright";
import ts from "typescript";

// Layout isolado: sem SDK, dados de cartão, servidor ou cobrança. Reproduz
// a estrutura e as regras externas do Cardinal e o contêiner da Bloopi.
const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const helper = ts.transpileModule(readFileSync(new URL("../src/lib/viewport-3ds.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const cssProvedor = `
  .cardinalOverlay-mask { position:fixed; inset:0; z-index:999998; background:rgba(0,0,0,.6); }
  .cardinalOverlay-content { position:fixed; z-index:999999; top:50%; left:50%; padding:24px 20px;
    transform:translate(-50%,-50%); background:#fff; opacity:0; border-radius:2px; }
  .cardinalOverlay-content.cardinalOverlay-open { display:block; opacity:1; }
  #Cardinal-ModalContent { height:100%; width:100%; }
  #Cardinal-ModalContent.size-03 { height:600px; }
  #Cardinal-CCA-IFrame { display:block; margin:0 auto; }
`;
const desafio = `<html><body style="margin:0;padding:20px;font:16px Arial;color:#222;box-sizing:border-box">
  <h2 style="font-size:20px">Teste visual de autenticação</h2><p>Conteúdo fictício, sem conexão bancária.</p>
  <label>Código de teste<input aria-label="Código de teste" style="display:block;width:100%;box-sizing:border-box;font-size:16px;margin-top:12px"></label>
  <div style="height:260px"></div><button style="padding:16px;background:#183638;color:white;border:0;border-radius:6px">Confirmar teste</button>
  </body></html>`;

async function quadro(page, provedor) {
  await page.setContent(`<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <style>${css}</style><style>${cssProvedor}</style>
    <main style="height:2400px;padding:32px">Checkout de teste — página rolada</main>
    <iframe id="metodo-oculto" style="display:none;width:0;height:0"></iframe>`);
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.addScriptTag({ content: `{const exports={};${helper};window.__limparViewport=exports.acompanharViewport3ds();}` });
  await page.evaluate(({ provedor, desafio }) => {
    const iframe = document.createElement("iframe");
    iframe.title = "Autenticação fictícia";
    iframe.width = "500";
    iframe.height = "600";
    iframe.srcdoc = desafio;
    const modal = document.createElement("div");
    if (provedor === "cardinal") {
      document.body.insertAdjacentHTML("beforeend", '<div id="Cardinal-Overlay" class="cardinalOverlay-mask"></div>');
      modal.id = "Cardinal-Modal";
      modal.className = "cardinalOverlay-content cardinalOverlay-open";
      modal.style.cssText = "width:540px;min-width:280px;max-width:540px;";
      modal.innerHTML = '<div id="Cardinal-ModalHeader" style="height:20px"></div><div id="Cardinal-ModalContent" class="size-03" tabindex="-1"></div>';
      iframe.id = "Cardinal-CCA-IFrame";
      modal.lastElementChild.appendChild(iframe);
    } else {
      modal.id = "bloopi-challenge";
      modal.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;display:flex;background:white;justify-content:center;align-items:center;";
      modal.appendChild(iframe);
    }
    document.body.appendChild(modal);
  }, { provedor, desafio });
  await page.frameLocator('iframe[title="Autenticação fictícia"]').getByRole("button").waitFor();
}

async function conferir(page, provedor, vista) {
  const selector = provedor === "cardinal" ? "#Cardinal-Modal" : "#bloopi-challenge iframe";
  const caixa = await page.locator(selector).boundingBox();
  assert.ok(caixa && caixa.width > 0 && caixa.height > 0);
  assert.ok(Math.abs(caixa.x + caixa.width / 2 - (vista.left + vista.width / 2)) <= 2, `centralizado horizontalmente: ${JSON.stringify(caixa)}`);
  assert.ok(Math.abs(caixa.y + caixa.height / 2 - (vista.top + vista.height / 2)) <= 2, `centralizado verticalmente: ${JSON.stringify(caixa)}`);
  assert.ok(caixa.y >= vista.top && caixa.y + caixa.height <= vista.top + vista.height + 1, "janela inteira na área visível");
  assert.ok(caixa.x >= vista.left && caixa.x + caixa.width <= vista.left + vista.width + 1, "sem corte nas laterais");
  const iframe = await page.locator('iframe[title="Autenticação fictícia"]').boundingBox();
  assert.ok(iframe.y >= vista.top && iframe.y + iframe.height <= vista.top + vista.height + 1, "iframe não ultrapassa a área visível");
  assert.equal(await page.locator("#metodo-oculto").isVisible(), false, "não abre iframes invisíveis de coleta");
}

for (const [nome, motor] of [["chromium", chromium], ["webkit", webkit]]) {
  test(`3DS centralizado em ${nome}: retrato, paisagem, teclado e fechamento`, async () => {
    const browser = await motor.launch();
    try {
      for (const provedor of ["cardinal", "bloopi"]) {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1 });
        await context.route("**/*", route => route.abort());
        const page = await context.newPage();
        for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }, { width: 768, height: 1024 }, { width: 1280, height: 800 }]) {
          await page.setViewportSize(viewport);
          await quadro(page, provedor);
          await conferir(page, provedor, { ...viewport, top: 0, left: 0 });
          if (viewport.width === 1280 && provedor === "cardinal") {
            assert.equal((await page.locator("#Cardinal-Modal").boundingBox()).width, 540, "desktop mantém a largura original do provedor");
          }
          await page.frameLocator('iframe[title="Autenticação fictícia"]').getByRole("button").click();
          if (process.env.CHECKOUT_LAYOUT_SCREENSHOTS && viewport.width === 390) {
            mkdirSync(process.env.CHECKOUT_LAYOUT_SCREENSHOTS, { recursive: true });
            await page.screenshot({ path: `${process.env.CHECKOUT_LAYOUT_SCREENSHOTS}/${nome}-${provedor}.png` });
          }
          await page.evaluate(() => window.__limparViewport());
        }

        // Teclado: viewport visual menor e deslocada, sem mudar a altura de
        // layout. Simula a API do navegador; teclado nativo exige teste físico.
        await page.setViewportSize({ width: 390, height: 844 });
        await quadro(page, provedor);
        await page.evaluate(() => {
          window.__limparViewport();
          const viewport = Object.assign(new EventTarget(), { width: 390, height: 844, offsetTop: 0, offsetLeft: 0 });
          Object.defineProperty(window, "visualViewport", { configurable: true, value: viewport });
        });
        await page.addScriptTag({ content: `{const exports={};${helper};window.__limparViewport=exports.acompanharViewport3ds();}` });
        await page.evaluate(() => {
          Object.assign(window.visualViewport, { width: 370, height: 340, offsetTop: 110, offsetLeft: 10 });
          window.visualViewport.dispatchEvent(new Event("resize"));
          window.visualViewport.dispatchEvent(new Event("scroll"));
        });
        await page.waitForFunction(() => document.documentElement.style.getPropertyValue("--cdp-3ds-vh") === "340px");
        await conferir(page, provedor, { width: 370, height: 340, top: 110, left: 10 });
        await page.frameLocator('iframe[title="Autenticação fictícia"]').getByRole("button").click();
        await page.locator(provedor === "cardinal" ? "#Cardinal-Modal" : "#bloopi-challenge").evaluate(el => el.style.display = "none");
        assert.equal(await page.locator(provedor === "cardinal" ? "#Cardinal-Modal" : "#bloopi-challenge").isVisible(), false, "SDK continua podendo fechar o modal");
        await page.evaluate(() => window.__limparViewport());
        assert.equal(await page.evaluate(() => document.documentElement.style.getPropertyValue("--cdp-3ds-vh")), "", "remove medidas ao sair do cartão");
        await context.close();
      }
    } finally { await browser.close(); }
  });
}
