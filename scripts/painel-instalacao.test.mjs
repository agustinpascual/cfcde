import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const fonte = readFileSync(new URL("../src/components/painel/dados.ts", import.meta.url), "utf8");
const js = ts.transpileModule(fonte, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function ambiente({ tabelaAusente, colunasAusentes = [] } = {}) {
  const consultas = [];
  const db = { from: tabela => ({ select: selecao => ({ limit: async () => {
    consultas.push({ tabela, selecao });
    const code = tabela === tabelaAusente ? "PGRST205"
      : selecao.split(",").some(coluna => colunasAusentes.includes(`${tabela}.${coluna}`)) ? "42703" : null;
    return { data: [], error: code ? { code } : null };
  } }) }) };
  const exports = {};
  vm.runInNewContext(js, { exports, console, require: id => {
    if (id === "server-only") return {};
    if (id === "@/lib/supabase/servidor") return { supabaseAdmin: () => db };
    if (id === "@/lib/data-brasilia") return { FUSO_BRASILIA: "America/Sao_Paulo" };
    throw new Error(`Dependência inesperada: ${id}`);
  } });
  return { ...exports, consultas };
}

test("instalação completa usa uma consulta por tabela e compartilha cache e consultas simultâneas", async () => {
  const a = ambiente();
  const [primeiro, simultaneo] = await Promise.all([a.estadoInstalacao(), a.estadoInstalacao()]);
  assert.equal(a.consultas.length, a.TABELAS.length);
  assert.equal(simultaneo, primeiro);
  assert.ok(primeiro.every(t => t.existe && t.colunasFaltando.length === 0));
  assert.equal(await a.estadoInstalacao(), primeiro);
  assert.equal(a.consultas.length, a.TABELAS.length);
  await a.estadoInstalacao(true);
  assert.equal(a.consultas.length, a.TABELAS.length * 2);
});

test("instalação incompleta identifica todas as colunas ausentes sem sondar tabelas inexistentes", async () => {
  const a = ambiente({ tabelaAusente: "conversas", colunasAusentes: ["pedidos.aviso_pix_em", "pedidos.recuperacao_pix_em"] });
  const resultado = await a.estadoInstalacao();
  assert.equal(resultado.find(t => t.nome === "conversas").existe, false);
  assert.deepEqual([...resultado.find(t => t.nome === "pedidos").colunasFaltando], ["aviso_pix_em", "recuperacao_pix_em"]);
  assert.equal(a.consultas.filter(c => c.tabela === "conversas").length, 1);
  assert.equal(a.consultas.length, a.TABELAS.length + 4);
});
