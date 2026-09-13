import assert from "node:assert/strict";
import test from "node:test";
import { chromium, webkit, devices } from "playwright";

// Executar contra um build local: ACESSO_TEST_BASE_URL=http://127.0.0.1:3100
// Escritas são interceptadas; nenhum pedido, evento ou login é enviado.
const base = process.env.ACESSO_TEST_BASE_URL;
if (base && !["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Use um servidor local.");
const mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const windows = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const linux = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const bloqueio = "Redirecionando…";

const perfis = [
  { nome: "Windows com janela estreita", motor: chromium, opcoes: { userAgent: windows, viewport: { width: 390, height: 844 } }, plataforma: "Win32", toques: 0 },
  { nome: "notebook Windows com touch", motor: chromium, opcoes: { userAgent: windows, hasTouch: true }, plataforma: "Win32", toques: 10 },
  { nome: "Linux", motor: chromium, opcoes: { userAgent: linux }, plataforma: "Linux x86_64", toques: 0 },
  { nome: "Mac Safari", motor: webkit, opcoes: { userAgent: mac }, plataforma: "MacIntel", toques: 0 },
  { nome: "iPhone Safari", motor: webkit, opcoes: devices["iPhone 13"], plataforma: "iPhone", toques: 5, permitido: true },
  { nome: "Android Chrome", motor: chromium, opcoes: devices["Pixel 7"], plataforma: "Linux armv8l", toques: 5, permitido: true },
  { nome: "tablet Android", motor: chromium, opcoes: devices["Galaxy Tab S4"], plataforma: "Linux armv8l", toques: 5, permitido: true },
  { nome: "iPad Safari modo desktop", motor: webkit, opcoes: { userAgent: mac, hasTouch: true, viewport: { width: 1366, height: 1024 } }, plataforma: "MacIntel", toques: 5, permitido: true },
];

for (const perfil of perfis) {
  test(`acesso à loja e ao painel: ${perfil.nome}`, { skip: !base && "defina ACESSO_TEST_BASE_URL" }, async () => {
    const browser = await perfil.motor.launch();
    let context;
    try {
      // Safari aplica upgrade-insecure-requests também no localhost. A origem
      // HTTPS abaixo é atendida pelo build local, sem mudar a CSP da loja.
      const origem = perfil.motor === webkit ? "https://acesso-teste.invalid" : base;
      context = await browser.newContext({ ...perfil.opcoes, serviceWorkers: "block" });
      context.setDefaultTimeout(10000);
      context.setDefaultNavigationTimeout(30000);
      let redirecionamentos = 0;
      await context.addInitScript(({ plataforma, toques }) => {
        Object.defineProperty(navigator, "platform", { get: () => plataforma });
        Object.defineProperty(navigator, "maxTouchPoints", { get: () => toques });
        Object.defineProperty(navigator, "userAgentData", { get: () => undefined });
        navigator.sendBeacon = () => true;
        localStorage.setItem("cdp-sacola", JSON.stringify([{ slug: "combo-plus2027", quantity: 1 }]));
      }, { plataforma: perfil.plataforma, toques: perfil.toques });
      await context.route("**/*", async route => {
        const req = route.request();
        const url = new URL(req.url());
        if (url.origin === "https://www.google.com" && req.isNavigationRequest()) {
          redirecionamentos++;
          return route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Destino de teste</title>" });
        }
        if (url.origin !== origem) return route.abort();
        if (req.method() !== "GET") return route.fulfill({ json: { ok: true } });
        if (url.pathname === "/api/pagamentos/config") return route.fulfill({ json: { pix: "axxonpay", cartao: null, publicKey: null, cartaoDisponivel: false } });
        if (origem !== base) return route.fulfill({ response: await route.fetch({
          url: `${base}${url.pathname}${url.search}`,
          headers: { ...req.headers(), host: url.host, "x-forwarded-host": url.host, "x-forwarded-proto": "https" },
        }) });
        return route.continue();
      });
      const page = await context.newPage();
      const erros = [];
      page.on("pageerror", erro => erros.push(erro.message));
      for (const caminho of ["/", "/checkout?produto=testes", "/produto/box-plus2027", "/categoria/lancamento", "/pagamento", "/box-2027"]) {
        const antes = redirecionamentos;
        // Vídeos e imagens podem continuar transferindo após a tela ficar
        // utilizável; a checagem espera a interface, não silêncio na rede.
        await page.goto(origem + caminho, { waitUntil: "domcontentloaded" });
        if (!perfil.permitido) {
          await page.waitForURL("https://www.google.com/");
          assert.equal(redirecionamentos, antes + 1, "computador redirecionado ao Google");
          assert.equal(await page.getByRole("button", { name: "Abrir sacola", exact: true }).count(), 0);
          assert.equal(await page.locator("input").count(), 0, "nenhum formulário da loja montado");
        } else {
          await page.locator("#acesso-dispositivo-titulo").waitFor({ state: "hidden" });
          assert.equal(redirecionamentos, 0, "celular e tablet não são redirecionados");
          assert.equal(await page.getByRole("heading", { name: bloqueio }).count(), 0);
          assert.equal(await page.getByText("Verificando seu dispositivo…", { exact: true }).count(), 0);
          if (caminho.startsWith("/checkout")) await page.getByLabel("CEP", { exact: true }).waitFor();
          if (caminho === "/categoria/lancamento" || caminho === "/produto/box-plus2027") {
            await page.getByRole("button", { name: "Abrir sacola", exact: true }).click();
            await page.getByRole("heading", { name: "Sua sacola", exact: true }).waitFor();
            await page.getByPlaceholder("Digite seu Cupom").fill("CAFECOMDEUS27");
            await page.getByRole("button", { name: "Aplicar", exact: true }).click();
            await page.getByText("Cupom CAFECOMDEUS27 aplicado!", { exact: true }).waitFor();
            const checkout = page.getByRole("link", { name: "Finalizar compra", exact: true });
            assert.match(await checkout.getAttribute("href"), /cupom=CAFECOMDEUS27/);
            await page.getByRole("button", { name: "Fechar carrinho", exact: true }).last().click();
            await page.setViewportSize({ width: 1366, height: 1024 });
            await page.getByRole("button", { name: "Abrir sacola", exact: true }).click();
            assert.equal(await page.getByPlaceholder("Digite seu Cupom").inputValue(), "CAFECOMDEUS27", "tablet em paisagem mantém o carrinho");
            assert.match(await checkout.getAttribute("href"), /cupom=CAFECOMDEUS27/);
          }
        }
        // Drena os prefetches iniciados por rolagem/resize antes de trocar de
        // documento. O WebKit reporta cancelamento desses GETs como erro CORS.
        await page.waitForLoadState("networkidle", { timeout: 30000 });
      }
      const antesDoPainel = redirecionamentos;
      await page.goto(origem + "/ioh3j4ciof3n3oic/entrar", { waitUntil: "domcontentloaded" });
      await page.getByLabel("Senha", { exact: true }).waitFor();
      assert.equal(redirecionamentos, antesDoPainel, "painel não redireciona ao Google");
      assert.equal(await page.getByRole("heading", { name: bloqueio }).count(), 0, "login administrativo liberado");
      assert.deepEqual(erros, [], "sem erros de renderização ou hidratação");
      await context.unrouteAll({ behavior: "wait" });
    } finally {
      await context?.unrouteAll({ behavior: "ignoreErrors" });
      await browser.close();
    }
  });
}
