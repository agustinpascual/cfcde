import assert from "node:assert/strict";
import test from "node:test";
import { bloqueioRegional } from "./cloudflare-access.mjs";

function requisicao(caminho, cf = { country: "BR", city: "Itajaí" }, opcoes) {
  const req = new Request(`https://cafecomdeusepai.com${caminho}`, opcoes);
  Object.defineProperty(req, "cf", { value: cf });
  return req;
}

test("bloqueia loja, checkout e criação de PIX nas três cidades configuradas", () => {
  for (const caminho of ["/", "/produtos/combo-plus2027", "/produto/box-plus2027", "/checkout", "/api/pix"]) {
    for (const city of ["Itajaí", "Itajai", "ITAJAÍ", " Itajai ", "Navegantes", "NAVEGANTES", "Balneário Camboriú", "Balneario Camboriu", "BALNEÁRIO CAMBORIÚ"]) {
      const resposta = bloqueioRegional(requisicao(caminho, { city, country: "BR" }));
      assert.equal(resposta?.status, 403, `${city} ${caminho}`);
      assert.equal(resposta.headers.get("cache-control"), "private, no-store");
    }
  }
});

test("bloqueia POST de PIX e todos os dispositivos sem depender do user-agent", () => {
  for (const ua of ["Mozilla/5.0 (Windows NT 10.0)", "Mozilla/5.0 (iPhone)", "", "Googlebot"]) {
    const req = requisicao("/api/pix?origem=teste", undefined, { method: "POST", headers: { "user-agent": ua } });
    assert.equal(bloqueioRegional(req)?.status, 403);
  }
});

test("preserva painel e integrações, sem liberar prefixos parecidos", () => {
  for (const city of ["Itajaí", "Navegantes", "Balneário Camboriú"]) {
    for (const caminho of ["/ioh3j4ciof3n3oic", "/ioh3j4ciof3n3oic/entrar", "/api/painel/entrar", "/api/webhooks/pinpay", "/api/cron/avisos-pix", "/_next/static/app.js", "/sites/logo.webp"]) {
      assert.equal(bloqueioRegional(requisicao(caminho, { country: "BR", city })), null, `${city} ${caminho}`);
    }
  }
  for (const caminho of ["/ioh3j4ciof3n3oic-falso", "/api/painel-falso", "/api/webhooks-falso"]) {
    assert.equal(bloqueioRegional(requisicao(caminho))?.status, 403, caminho);
  }
});

test("outras cidades e ausência de geolocalização não são bloqueadas", () => {
  for (const cf of [{ country: "BR", city: "Camboriú" }, { country: "BR", city: "Itapema" }, { country: "BR", city: "São Paulo" }, { country: "US", city: "Itajai" }, {}, null]) {
    assert.equal(bloqueioRegional(requisicao("/", cf)), null);
  }
});

test("headers de localização forjados não sobrepõem a localização da Cloudflare", () => {
  const headers = { "cf-ipcity": "São Paulo", "x-vercel-ip-city": "São Paulo", "cf-ipcountry": "US" };
  assert.equal(bloqueioRegional(requisicao("/api/pix", undefined, { headers }))?.status, 403);
  assert.equal(bloqueioRegional(requisicao("/", {}, { headers: { "cf-ipcity": "Itajai" } })), null);
});
