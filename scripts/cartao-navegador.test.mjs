import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";

// Executar com o Next dev já aberto e AXXONPAY_PUBLIC_KEY (pública) no ambiente.
// Carrega o SDK REAL da Axxon e o bloopi.js sob a CSP do checkout. O POST de
// cobrança é interceptado e respondido localmente: nenhuma cobrança é criada,
// nenhum dado sai para a AxxonPay. O nextAction fictício exercita o caminho do
// 3DS até a Bloopi recusar o intent inexistente, o que também valida a CSP dos
// provedores de 3DS. Não substitui a homologação com cartão próprio.
const base = process.env.CHECKOUT_TEST_BASE_URL ?? "http://localhost:3000";
const publicKey = process.env.AXXONPAY_PUBLIC_KEY;

test("checkout: cartão AxxonPay/Bloopi no navegador sem criar cobrança", { skip: !publicKey && "defina AXXONPAY_PUBLIC_KEY" }, async () => {
  for (const [caminho, deve] of [["/checkout?produto=testes", true], ["/", false]]) {
    const csp = (await fetch(`${base}${caminho}`, { redirect: "manual" })).headers.get("content-security-policy") ?? "";
    assert.equal(csp.includes("app.bloopi.io") && csp.includes("frame-src https:"), deve, `CSP de ${caminho}`);
    assert.match(csp, /frame-ancestors 'none'/);
  }
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    const violacoes = [], erros = [], externos = new Set();
    const postsCartao = [];
    let cobrancas = 0;
    await context.addInitScript(() => document.addEventListener("securitypolicyviolation", e => console.log(`CSPVIOLATION ${e.violatedDirective} ${e.blockedURI}`)));
    await context.route("**/*", async route => {
      const req = route.request(), url = new URL(req.url());
      if (url.origin !== base) { externos.add(url.host); return route.continue(); }
      if (req.method() !== "GET") {
        if (url.pathname === "/api/pix") cobrancas++;
        if (url.pathname === "/api/pagamentos/cartao") {
          postsCartao.push({ headers: req.headers(), body: JSON.parse(req.postData() ?? "{}") });
          // Reproduz o caso real: a primeira chamada reencontra o intent antigo
          // sem nextAction; o checkout deve renovar uma vez no mesmo clique.
          if (postsCartao.length === 1) return route.fulfill({ status: 409, json: {
            erro: "A tentativa anterior não pôde ser confirmada e expira sem cobrança. Iniciando uma nova tentativa segura.",
            codigo: "TENTATIVA_ENCERRADA_SEM_COBRANCA", renovar: true,
          } });
          return route.fulfill({ json: { id: "axxon_teste", pedido: "100001", total: 1000, status: "pending", qr_code: "", qr_code_url: null,
            nextAction: { type: "CLIENT_CONFIRMATION", provider: "bloopi", payload: { paymentId: "teste", externalPaymentId: "pi_inexistente", clientSecret: "cs_inexistente", publicKey: null } } } });
        }
        return route.fulfill({ status: 200, json: {} });
      }
      if (url.pathname === "/api/pagamentos/config") return route.fulfill({ json: { pix: "axxonpay", cartao: "axxonpay", publicKey, cartaoDisponivel: true, parcelas: 4 } });
      if (url.pathname === "/api/cep") return route.fulfill({ json: { street: "Praça da Sé", neighborhood: "Sé", city: "São Paulo", state: "SP" } });
      if (url.pathname.startsWith("/api/pix/")) return route.fulfill({ json: { id: "axxon_teste", status: "pending" } });
      return route.continue();
    });
    const page = await context.newPage();
    page.on("console", m => {
      const t = m.text();
      if (t.startsWith("CSPVIOLATION") || /violates the following Content Security Policy/.test(t)) violacoes.push(t.slice(0, 200));
    });
    page.on("pageerror", e => erros.push(String(e).slice(0, 200)));

    await page.goto(`${base}/checkout?produto=testes`, { waitUntil: "networkidle" });
    assert.ok((await page.getByText(/Produto de teste/).count()) > 0, "produto de homologação no checkout");
    await page.getByLabel("CEP", { exact: true }).fill("01001000");
    await page.getByRole("radio", { name: /Correios - PAC/ }).check();
    await page.getByLabel("E-mail", { exact: true }).fill("teste@example.com");
    await page.getByLabel("Nome", { exact: true }).fill("Teste");
    await page.getByLabel("Sobrenome", { exact: true }).fill("Local");
    await page.getByLabel("Telefone com DDD").fill("11999999999");
    await page.getByLabel("CPF ou CNPJ").fill("00000000000");
    await page.getByLabel("Número", { exact: true }).fill("123");
    await page.getByRole("button", { name: "Continuar para pagamento" }).click();

    const opcao = page.getByRole("radio", { name: /Cartão de crédito/ });
    await opcao.waitFor({ timeout: 10000 });
    await opcao.click();
    const botao = page.getByRole("button", { name: /Pagar R\$|Carregando pagamento seguro|Cartão indisponível/ });
    await botao.waitFor({ timeout: 15000 });
    await page.waitForFunction(() => window.Axxon?.isReady === true && typeof window.Bloopi === "function", null, { timeout: 60000 });
    assert.match(await botao.innerText(), /^Pagar R\$\s10,00$/);
    assert.ok(await botao.isEnabled());
    // globals.css zera background/borda/padding/fonte de todo <button> fora de
    // .sf-root; o botão precisa vencer essa regra ou vira texto solto.
    const estilo = await botao.evaluate(b => { const cs = getComputedStyle(b); return { bg: cs.backgroundColor, cor: cs.color, fonte: parseFloat(cs.fontSize), altura: b.getBoundingClientRect().height }; });
    assert.equal(estilo.bg, "rgb(17, 17, 17)", "fundo preto do botão de pagar");
    assert.equal(estilo.cor, "rgb(255, 255, 255)", "texto branco do botão de pagar");
    assert.ok(estilo.fonte >= 15 && estilo.altura >= 50, `botão legível: ${JSON.stringify(estilo)}`);

    // Luhn inválido não sai do navegador.
    await page.getByLabel("Número do cartão").fill("4111111111111112");
    await page.getByLabel("Nome impresso no cartão").fill("Cliente Teste");
    await page.getByLabel("Validade (MM/AA)").fill("1235");
    await page.getByLabel("CVV").fill("123");
    await botao.click();
    await page.locator("p[role=alert]").waitFor({ timeout: 5000 });
    assert.match(await page.locator("p[role=alert]").innerText(), /número do cartão/);
    assert.equal(postsCartao.length, 0);

    // Número de teste público: POST interceptado; 3DS tenta a Bloopi e falha (intent fictício).
    await page.getByLabel("Número do cartão").fill("4111 1111 1111 1111");
    await page.getByLabel("Parcelas").selectOption("2");
    await botao.click();
    await page.waitForFunction(() => document.querySelector("h2")?.textContent?.includes("Confirmando"), null, { timeout: 20000 });
    await page.waitForTimeout(6000);
    assert.equal(postsCartao.length, 2, "intent antigo renovado uma única vez no mesmo clique");
    const postCartao = postsCartao[1];
    assert.match(postCartao.headers["content-type"], /application\/json/);
    assert.deepEqual(postCartao.body.cartao, { numero: "4111111111111111", titular: "Cliente Teste", mes: 12, ano: 2035, cvv: "123" });
    assert.deepEqual(postsCartao[0].body.cartao, postCartao.body.cartao);
    assert.notEqual(postsCartao[0].body.tentativa, postCartao.body.tentativa, "nova tentativa usa outro UUID");
    assert.equal(postCartao.body.installments, 2);
    assert.match(postCartao.body.tentativa, /^[a-f0-9-]{36}$/);
    assert.equal(postCartao.body.produto, "testes");
    assert.ok(await page.evaluate(() => [...document.querySelectorAll("input[autocomplete^=cc-]")].every(i => i.value === "")), "campos de cartão limpos");
    assert.match(await page.locator("p[role=alert]").innerText(), /autenticação com o seu banco não foi concluída/);
    for (const host of ["app.axxonpay.com.br", "app.bloopi.io", "api.bloopi.io"]) assert.ok(externos.has(host), `contatou ${host}`);
    assert.deepEqual(violacoes, [], "sem violações de CSP");
    assert.deepEqual(erros, [], "sem erros de página");
    assert.equal(cobrancas, 0, "nenhum PIX gerado");
  } finally { await browser.close(); }
});
