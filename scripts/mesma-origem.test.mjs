import test from "node:test";
import assert from "node:assert/strict";
import { mesmaOrigem } from "../src/lib/mesma-origem.ts";

test("aceita a origem direta e a origem pública encaminhada pela VPS", () => {
  assert.equal(mesmaOrigem(new Request("https://cafecomdeusepai.com/api/painel/integracoes", {
    headers: { origin: "https://cafecomdeusepai.com" },
  })), true);

  assert.equal(mesmaOrigem(new Request("http://10.0.1.29:3000/api/painel/integracoes", {
    headers: {
      origin: "https://cafecomdeusepai.com",
      host: "10.0.1.29:3000",
      "x-forwarded-host": "cafecomdeusepai.com",
      "x-forwarded-proto": "https",
    },
  })), true);
});

test("recusa origem ausente, domínio divergente e protocolo divergente", () => {
  assert.equal(mesmaOrigem(new Request("https://cafecomdeusepai.com/api/painel/integracoes")), false);
  assert.equal(mesmaOrigem(new Request("http://10.0.1.29:3000/api/painel/integracoes", {
    headers: { origin: "https://malicioso.example", "x-forwarded-host": "cafecomdeusepai.com", "x-forwarded-proto": "https" },
  })), false);
  assert.equal(mesmaOrigem(new Request("http://10.0.1.29:3000/api/painel/integracoes", {
    headers: { origin: "http://cafecomdeusepai.com", "x-forwarded-host": "cafecomdeusepai.com", "x-forwarded-proto": "https" },
  })), false);
});
