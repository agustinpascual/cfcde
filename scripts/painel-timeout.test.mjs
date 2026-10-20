import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const fonte = readFileSync(new URL("../src/lib/supabase/painel.ts", import.meta.url), "utf8");
const js = ts.transpileModule(fonte, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function ambiente(chave = "credencial-apenas-de-teste") {
  let opcoes;
  let construcoes = 0;
  let prazo;
  const exports = {};
  const fetchPendente = (_url, init) => new Promise((resolve, reject) => {
    if (init.signal.aborted) return reject(init.signal.reason);
    init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true });
  });
  vm.runInNewContext(js, {
    exports,
    process: { env: { SUPABASE_SERVICE_ROLE_KEY: chave } },
    fetch: fetchPendente,
    AbortSignal: {
      any: sinais => AbortSignal.any(sinais),
      timeout: ms => { prazo = ms; return AbortSignal.timeout(20); },
    },
    require: id => {
      if (id === "server-only") return {};
      if (id === "./config") return { SUPABASE_URL: "https://example.test" };
      if (id === "@supabase/supabase-js") return {
        createClient: (_url, _chave, config) => { opcoes = config; construcoes++; return { config }; },
      };
      throw new Error(`Dependência inesperada: ${id}`);
    },
  });
  return { ...exports, get opcoes() { return opcoes; }, get construcoes() { return construcoes; }, get prazo() { return prazo; } };
}

test("cancela leitura que não responde e reutiliza o cliente do painel", async () => {
  const a = ambiente();
  assert.equal(a.supabasePainel(), a.supabasePainel());
  assert.equal(a.construcoes, 1);
  // Mantém o processo ativo enquanto o timer nativo (unref) dispara.
  const manter = setInterval(() => {}, 1000);
  try {
    await assert.rejects(a.opcoes.global.fetch("https://example.test"), { name: "TimeoutError" });
    assert.equal(a.prazo, 8000);
  } finally { clearInterval(manter); }
});

test("preserva cancelamento solicitado pelo chamador", async () => {
  const a = ambiente();
  a.supabasePainel();
  const controller = new AbortController();
  const resposta = a.opcoes.global.fetch("https://example.test", { signal: controller.signal });
  controller.abort();
  await assert.rejects(resposta, { name: "AbortError" });
});

test("sem configuração não cria cliente nem consulta banco", () => {
  const a = ambiente("");
  assert.equal(a.supabasePainel(), null);
  assert.equal(a.construcoes, 0);
});
