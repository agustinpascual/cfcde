import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function ambiente() {
  const tags = [], timers = new Map();
  let contador = 0;
  const window = { setTimeout: f => { timers.set(++contador, f); return contador; }, clearTimeout: id => timers.delete(id) };
  class Script extends EventTarget {
    dataset = {};
    remove() { tags.splice(tags.indexOf(this), 1); }
  }
  const document = { querySelector: () => tags[0] ?? null, createElement: () => new Script(), head: { appendChild: s => tags.push(s) } };
  const exports = {};
  const js = ts.transpileModule(readFileSync(new URL('../src/lib/carregar-bloopi.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(js, { exports, window, document });
  return { ...exports, tags, timers, window };
}

test('antecipação e inicialização simultâneas compartilham um único download', async () => {
  const a = ambiente();
  const primeira = a.carregarBloopiPeloSite(), segunda = a.carregarBloopiPeloSite();
  assert.equal(primeira, segunda);
  assert.equal(a.tags.length, 1);
  a.window.Bloopi = function() {};
  a.tags[0].dispatchEvent(new Event('load'));
  await Promise.all([primeira, segunda]);
  assert.equal(a.timers.size, 0);
  await a.carregarBloopiPeloSite();
  assert.equal(a.tags.length, 1);
});

for (const falha of ['timeout', 'error', 'load_sem_sdk']) {
  test(`download interrompido (${falha}) permite repetir sem tag ou timer pendurado`, async () => {
    const a = ambiente();
    const primeira = a.carregarBloopiPeloSite();
    const rejeicao = assert.rejects(primeira, /ambiente seguro/);
    const antiga = a.tags[0];
    if (falha === 'timeout') [...a.timers.values()][0]();
    else antiga.dispatchEvent(new Event(falha === 'error' ? 'error' : 'load'));
    await rejeicao;
    assert.equal(a.tags.length, 0);
    assert.equal(a.timers.size, 0);
    const segunda = a.carregarBloopiPeloSite();
    assert.notEqual(a.tags[0], antiga);
    // Eventos atrasados do download anterior não interferem na nova tentativa.
    antiga.dispatchEvent(new Event('error'));
    assert.equal(a.tags.length, 1);
    a.window.Bloopi = function() {};
    a.tags[0].dispatchEvent(new Event('load'));
    await segunda;
    assert.equal(a.timers.size, 0);
  });
}
