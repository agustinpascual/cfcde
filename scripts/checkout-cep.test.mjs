import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";

// Executar com o Next dev já aberto. Isola APIs e bloqueia todas as escritas:
// não cria pedidos, cobranças, eventos analíticos nem carrinhos abandonados.
const base = process.env.CHECKOUT_TEST_BASE_URL ?? "http://localhost:3000";
const completo = { street: "Praça da Sé", neighborhood: "Sé", city: "São Paulo", state: "SP" };
const parcial = { street: "", neighborhood: "", city: "Acaraú", state: "CE" };

test("checkout: CEP completo, parcial e indisponível no celular", async t => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const caso of [
      { nome: "62580-000 libera rua e bairro", cep: "62580000", dados: parcial },
      { nome: "somente bairro ausente", cep: "11111111", dados: { ...completo, neighborhood: "" } },
      { nome: "somente rua ausente", cep: "22222222", dados: { ...completo, street: " " } },
      { nome: "01001-000 mantém endereço automático", cep: "01001000", dados: completo },
      { nome: "falha da consulta permite preenchimento manual", cep: "33333333", dados: { error: "Serviço indisponível" }, status: 502 },
    ]) {
      await t.test(caso.nome, async () => {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
        let cobrancas = 0;
        await context.route("**/*", async route => {
          const req = route.request(), url = new URL(req.url());
          if (url.origin !== base) return route.abort();
          if (req.method() !== "GET") {
            if (["/api/pix", "/api/pagamentos/cartao"].includes(url.pathname)) cobrancas++;
            return route.fulfill({ status: 200, json: {} });
          }
          if (url.pathname === "/api/pagamentos/config") return route.fulfill({ json: { pix: "pinpay", cartao: "desativado", publicKey: null } });
          if (url.pathname === "/api/cep") return route.fulfill({ status: caso.status ?? 200, json: caso.dados });
          return route.continue();
        });
        const page = await context.newPage();
        try {
          await page.goto(`${base}/checkout?produto=combo-plus2027`, { waitUntil: "networkidle" });
          await page.getByLabel("CEP", { exact: true }).fill(caso.cep);
          await page.getByRole("radio", { name: /Correios - PAC/ }).check();
          await page.getByLabel("E-mail", { exact: true }).fill("teste@example.com");
          await page.getByLabel("Nome", { exact: true }).fill("Teste");
          await page.getByLabel("Sobrenome", { exact: true }).fill("Local");
          await page.getByLabel("Telefone com DDD").fill("11999999999");
          // CPF fictício com dígitos verificadores válidos; a finalidade deste
          // teste é o endereço, não exercitar a rejeição de documento.
          await page.getByLabel("CPF ou CNPJ").fill("52998224725");
          await page.getByLabel("Número", { exact: true }).fill("123");
          const manual = caso.status || !caso.dados.street?.trim() || !caso.dados.neighborhood?.trim();
          if (manual) {
            await page.getByLabel("Endereço", { exact: true }).waitFor({ state: "visible" });
            assert.equal(await page.getByLabel("Cidade", { exact: true }).inputValue(), caso.dados.city ?? "");
            assert.equal(await page.getByLabel("Estado", { exact: true }).inputValue(), caso.dados.state ?? "");
            await page.getByRole("button", { name: "Continuar para pagamento", exact: true }).click();
            await page.getByText(/^Preencha os campos do endereço:/).waitFor();
            await page.getByLabel("Endereço", { exact: true }).fill("Rua de Teste");
            await page.getByLabel("Bairro", { exact: true }).fill("Centro");
            if (caso.status) {
              await page.getByLabel("Cidade", { exact: true }).fill("Acaraú");
              await page.getByLabel("Estado", { exact: true }).fill("ce");
            }
            // Preencher o último campo não deve desmontar os inputs nem perder foco.
            assert.equal(await page.getByLabel("Endereço", { exact: true }).isVisible(), true);
            assert.equal(await page.getByLabel("Bairro", { exact: true }).inputValue(), "Centro");
          } else {
            await page.getByText("Praça da Sé", { exact: true }).waitFor();
            assert.equal(await page.getByLabel("Endereço", { exact: true }).count(), 0);
          }
          await page.getByRole("button", { name: "Continuar para pagamento", exact: true }).click();
          await page.getByRole("heading", { name: "Forma de pagamento", exact: true }).waitFor();
          assert.equal(cobrancas, 0);
        } finally { await context.close(); }
      });
    }
  } finally { await browser.close(); }
});
