import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/checkout-contato.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports });
const { saveCheckoutContact, readCheckoutContact, SAVED_CONTACT_KEY } = exports;
const contact = { email: "Pessoa@example.com", firstName: "Pessoa", lastName: "Teste", documentNumber: "00000000000",
  phone: "11999999999", cep: "01001000", withoutNumber: false, shippingMethod: "sedex", sameInvoiceData: true,
  address: { street: "Praça teste", number: "10", complement: "Apto 2", neighborhood: "Centro", city: "São Paulo", state: "sp" } };
function storage() {
  const map = new Map();
  return { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k) };
}
test("restaura contato completo somente para o mesmo email normalizado", () => {
  const s = storage();
  assert.equal(readCheckoutContact(s, contact.email), null);
  assert.equal(saveCheckoutContact(s, contact, 1000), true);
  const result = readCheckoutContact(s, "  PESSOA@example.com ", 1001);
  assert.equal(result.email, "pessoa@example.com");
  assert.equal(result.firstName, "Pessoa");
  assert.equal(result.lastName, "Teste");
  assert.equal(result.phone, "11999999999");
  assert.equal(result.cep, "01001000");
  assert.equal(result.address.complement, "Apto 2");
  assert.equal(result.address.number, "10");
  assert.equal(result.address.state, "SP");
  assert.equal(result.documentNumber, contact.documentNumber);
  assert.equal(result.shippingMethod, "sedex");
  assert.equal(result.sameInvoiceData, true);
  assert.equal(readCheckoutContact(s, "outra@example.com", 1001), null);
});
test("não armazena cartão nem campos desconhecidos", () => {
  const s = storage();
  saveCheckoutContact(s, { ...contact, cardNumber: "CARD-SECRET", cvv: "SECRET", address: { ...contact.address, token: "SECRET" } });
  assert.ok(!s.getItem(SAVED_CONTACT_KEY).includes("SECRET"));
});
test("ignora dados antigos, inválidos, expirados e armazenamento indisponível", () => {
  const s = storage();
  for (const value of ["{", "null", JSON.stringify({ email: contact.email, phone: contact.phone })]) {
    s.setItem(SAVED_CONTACT_KEY, value);
    assert.equal(readCheckoutContact(s, contact.email), null);
  }
  saveCheckoutContact(s, contact, 1000);
  assert.equal(readCheckoutContact(s, contact.email, 1000 + 91 * 86400000), null);
  assert.equal(readCheckoutContact(s, contact.email, 999), null);
  assert.equal(saveCheckoutContact(s, { ...contact, cep: "1" }), false);
  assert.equal(saveCheckoutContact({ setItem() { throw Error(); } }, contact), false);
  assert.equal(readCheckoutContact({ getItem() { throw Error(); } }, contact.email), null);
});
test("remoção impede preenchimento e endereço sem número é preservado", () => {
  const s = storage();
  assert.equal(saveCheckoutContact(s, { ...contact, withoutNumber: true, address: { ...contact.address, number: "" } }), true);
  assert.equal(readCheckoutContact(s, contact.email).withoutNumber, true);
  s.removeItem(SAVED_CONTACT_KEY);
  assert.equal(readCheckoutContact(s, contact.email), null);
});
