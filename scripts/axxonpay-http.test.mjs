import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as protocolo from "../src/lib/axxonpay-protocolo.ts";

const rejeicao = "customer.document: O número do documento (CPF/CNPJ) é inválido.";
for (const caso of [
  { status: 400, body: { errorMessage: rejeicao }, libera: true },
  { status: 400, body: { errorMessage: "Falha desconhecida" }, libera: false },
  { status: 400, body: { errorMessage: rejeicao, data: { id: "payment_uuid" } }, libera: false },
  { status: 500, body: { errorMessage: rejeicao }, libera: false },
  { status: 401, body: { errorMessage: rejeicao }, libera: false },
]) {
  test(`classifica rejeição sem expor corpo: HTTP ${caso.status}, libera=${caso.libera}, id=${!!caso.body.data}`, async () => {
    const deps = { "server-only": {}, "./config-integracoes": { ler: async () => "credencial-ficticia" }, "./axxonpay-protocolo": protocolo };
    const fonte = readFileSync(new URL("../src/lib/axxonpay.ts", import.meta.url), "utf8");
    const js = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {};
    let chamadas = 0;
    vm.runInNewContext(js, { exports, AbortSignal, require: id => {
      if (!(id in deps)) throw new Error(`Dependência não simulada: ${id}`);
      return deps[id];
    }, fetch: async () => { chamadas++; return Response.json(caso.body, { status: caso.status }); } });
    await assert.rejects(exports.chamarAxxon("/direct/payment", { method: "POST", body: "{}" }), erro => {
      assert.equal(Boolean(erro.documentoInvalido), caso.libera);
      assert.equal(erro.message, `AxxonPay respondeu HTTP ${caso.status}.`);
      return true;
    });
    assert.equal(chamadas, 1);
  });
}
