import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function carregar(caminho, dependencias = {}) {
  const exports = {};
  const fonte = ts.transpileModule(readFileSync(new URL(caminho, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(fonte, { exports, require: id => dependencias[id] });
  return exports;
}
const dispositivos = carregar("../src/lib/dispositivos.ts");
const { SCRIPT_ACESSO_INICIAL } = carregar("../src/lib/acesso-inicial.ts", { "./dispositivos": dispositivos });

test("script antecipado preserva a identificação de celular/tablet e o bloqueio de computador", () => {
  for (const [ua, plataforma, toques, permitido] of [
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Mobile", "iPhone", 5, true],
    ["Mozilla/5.0 (Linux; Android 14) Chrome/128 Mobile", "Android", 5, true],
    ["Mozilla/5.0 (Linux; Android 14) Chrome/128", "Android", 5, true],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", "MacIntel", 5, true],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", "MacIntel", 0, false],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Win32", 10, false],
    ["Mozilla/5.0 (X11; Linux x86_64)", "Linux", 0, false],
    ["", "", 0, false],
  ]) {
    for (const pathname of ["/", "/checkout", "/ioh3j4ciof3n3oic", "/ioh3j4ciof3n3oic/entrar", "/ioh3j4ciof3n3oic-falso"]) {
      const dataset = {};
      const destinos = [];
      vm.runInNewContext(SCRIPT_ACESSO_INICIAL, {
        navigator: { userAgent: ua, platform: plataforma, maxTouchPoints: toques },
        document: { documentElement: { dataset } },
        location: { pathname, replace: url => destinos.push(url) },
      });
      assert.equal(dataset.cdpAcesso, permitido ? "liberado" : "bloqueado");
      assert.equal(dispositivos.dispositivoPodeAbrirLoja(ua, plataforma, toques), permitido);
      const painel = pathname === "/ioh3j4ciof3n3oic" || pathname.startsWith("/ioh3j4ciof3n3oic/");
      assert.deepEqual(destinos, !permitido && !painel ? ["https://www.google.com"] : []);
    }
  }
});
