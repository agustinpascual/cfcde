import assert from "node:assert/strict";
import test from "node:test";
import config from "../next.config.ts";
import { sitePublicoEmail } from "../src/lib/site-email.ts";

test("www do domínio principal redireciona para o domínio sem www", async () => {
  const redirects = await config.redirects();
  assert.ok(redirects.some((redirect) =>
    redirect.source === "/:path*"
      && redirect.has?.some((condicao) => condicao.type === "host" && condicao.value === "www.cafecomdeuspai.net")
      && redirect.destination === "https://cafecomdeuspai.net/:path*"
      && redirect.permanent === true
  ));
});

test("links públicos de e-mail usam o novo domínio quando o ambiente não é público", () => {
  assert.equal(sitePublicoEmail("http://localhost:3000"), "https://cafecomdeuspai.net");
});
