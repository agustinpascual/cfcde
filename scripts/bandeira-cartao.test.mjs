import test from "node:test";
import assert from "node:assert/strict";
import { identificarBandeiraCartao, LOGOS_BANDEIRA, NOMES_BANDEIRA } from "../src/lib/bandeira-cartao.ts";

test("identifica as principais bandeiras sem consulta externa", () => {
  const casos = new Map([
    ["4111111111111111", "visa"], ["5555555555554444", "mastercard"],
    ["2221000000000009", "mastercard"], ["371449635398431", "amex"],
    ["4011780000000000", "elo"], ["6062820000000000", "hipercard"],
    ["3056930009020004", "diners"], ["6011111111111117", "discover"],
    ["3530111333300000", "jcb"],
  ]);
  for (const [numero, bandeira] of casos) assert.equal(identificarBandeiraCartao(numero), bandeira, numero);
});

test("aceita número formatado, aguarda prefixo suficiente e não confunde desconhecido", () => {
  assert.equal(identificarBandeiraCartao("4111 1111"), "visa");
  assert.equal(identificarBandeiraCartao("2"), null);
  assert.equal(identificarBandeiraCartao("123456789"), null);
  assert.equal(identificarBandeiraCartao("6221250000000000"), null);
  assert.equal(identificarBandeiraCartao("6221260000000000"), "discover");
  assert.equal(identificarBandeiraCartao("6229260000000000"), null);
});

test("toda bandeira tem nome e as principais têm logo local", () => {
  for (const bandeira of ["visa", "mastercard", "elo", "amex", "hipercard", "diners", "discover", "jcb"]) {
    assert.ok(NOMES_BANDEIRA[bandeira]);
  }
  for (const bandeira of ["visa", "mastercard", "elo", "amex", "hipercard"]) {
    assert.ok(LOGOS_BANDEIRA[bandeira]?.startsWith("/sites/"));
  }
});
