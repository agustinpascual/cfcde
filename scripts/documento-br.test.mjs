import assert from "node:assert/strict";
import { documentoBrasileiroValido } from "../src/lib/documento-br.ts";

assert.equal(documentoBrasileiroValido("529.982.247-25"), true, "aceita CPF com dígitos verificadores válidos");
assert.equal(documentoBrasileiroValido("529.982.247-24"), false, "recusa CPF com dígito alterado");
assert.equal(documentoBrasileiroValido("111.111.111-11"), false, "recusa CPF repetido");
assert.equal(documentoBrasileiroValido("11.222.333/0001-81"), true, "aceita CNPJ com dígitos verificadores válidos");
assert.equal(documentoBrasileiroValido("11.222.333/0001-82"), false, "recusa CNPJ com dígito alterado");
assert.equal(documentoBrasileiroValido("00.000.000/0000-00"), false, "recusa CNPJ repetido");

console.log("documento-br: ok");
