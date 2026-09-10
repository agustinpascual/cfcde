import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const fonte = readFileSync(new URL("../src/lib/config-integracoes.ts", import.meta.url), "utf8");

function carregar(resultados, { decifrar = (valor) => valor, ambiente = {} } = {}) {
  let consultas = 0;
  const fila = [...resultados];
  const db = {
    from() {
      return {
        async select() {
          consultas++;
          return fila.shift() ?? resultados.at(-1);
        },
      };
    },
  };
  const compilado = ts.transpileModule(fonte, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compilado, {
    exports, console, setTimeout,
    process: { env: ambiente },
    require(id) {
      if (id === "server-only") return {};
      if (id === "./cofre") return {
        cifrar: (v) => v, decifrar, mascarar: (v) => v,
        temChaveMestra: () => true,
      };
      if (id === "./supabase/servidor") return { supabaseAdmin: () => db };
      throw new Error(`Dependência externa não autorizada: ${id}`);
    },
  });
  return { api: exports, consultas: () => consultas };
}

test("cofre repete uma falha transitória sem perder a credencial", async () => {
  const mod = carregar([
    { data: null, error: { message: "falha temporária" } },
    { data: [{ chave: "AXXONPAY_SECRET_KEY", valor_cifrado: "segredo-ok" }], error: null },
  ]);
  assert.equal(await mod.api.ler("AXXONPAY_SECRET_KEY"), "segredo-ok");
  assert.equal(mod.consultas(), 2);
});

test("cofre não apresenta valor indecifrável como credencial ausente", async () => {
  const mod = carregar([
    { data: [{ chave: "PINPAY_TOKEN", valor_cifrado: "incompatível" }], error: null },
  ], { decifrar: () => null });
  await assert.rejects(() => mod.api.ler("PINPAY_TOKEN"), /CHAVE_MESTRA não corresponde/);
});

test("cofre encerra após três falhas com mensagem recuperável", async () => {
  const mod = carregar([{ data: null, error: { message: "indisponível" } }]);
  await assert.rejects(() => mod.api.ler("PINPAY_TOKEN"), /após 3 tentativas/);
  assert.equal(mod.consultas(), 3);
});
