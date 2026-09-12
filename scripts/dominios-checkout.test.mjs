import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { mesmaOrigem } from "../src/lib/mesma-origem.ts";

function carregar(caminho, dependencias, env = {}) {
  const fonte = readFileSync(new URL(caminho, import.meta.url), "utf8");
  const exports = {};
  const js = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(js, { exports, Response, URL, process: { env }, require: id => {
    if (!(id in dependencias)) throw new Error(`Dependência não simulada: ${id}`);
    return dependencias[id];
  } });
  return exports;
}
const { origemOficial } = carregar("../src/lib/origem.ts", { "server-only": {}, "./mesma-origem": { mesmaOrigem } },
  { NEXT_PUBLIC_DOMINIOS_OFICIAIS: "antigo.example" });
const { POST } = carregar("../src/app/api/seguranca/origem/route.ts", { "@/lib/mesma-origem": { mesmaOrigem } });
const req = (host, origin = `https://${host}`) => new Request("http://0.0.0.0:3000/api/pagamentos/cartao", {
  method: "POST", headers: { origin, "x-forwarded-host": host, "x-forwarded-proto": "https", host },
});

test("alias novo no Traefik usa o mesmo checkout sem rebuild da lista de domínios", async () => {
  for (const host of ["antigo.example", "vinimaiochi.fans", "www.novo.example"]) {
    assert.equal(origemOficial(req(host)), true);
    const r = await POST(req(host));
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { permitido: true });
    assert.equal(r.headers.get("cache-control"), "no-store");
  }
});

test("origem externa divergente não passa pela confirmação do novo domínio", async () => {
  for (const origin of ["https://clone.example", "http://vinimaiochi.fans", "https://vinimaiochi.fans.clone.example", "null"]) {
    assert.equal(origemOficial(req("vinimaiochi.fans", origin)), false);
    assert.equal((await POST(req("vinimaiochi.fans", origin))).status, 403);
  }
  assert.equal((await POST(new Request("https://vinimaiochi.fans/api/seguranca/origem", { method: "POST" }))).status, 403);
});
