import assert from "node:assert/strict";
import test from "node:test";
import { agruparDispositivo, contarDispositivos, detectarDispositivo, GRUPOS_DISPOSITIVOS, TIPOS_DISPOSITIVOS } from "../src/lib/dispositivos.ts";

test("identifica sistemas e diferencia celulares de tablets", () => {
  const casos = [
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile", null, 5, "iphone"],
    ["Mozilla/5.0 (Linux; Android 14) Chrome/128 Mobile", null, 5, "android"],
    ["Mozilla/5.0 (Linux; Android 14) Chrome/128", null, 5, "android_tablet"],
    ["Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)", null, 5, "ipad"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", "MacIntel", 5, "ipad"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", "MacIntel", 0, "mac"],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64)", null, 0, "windows"],
    ["Mozilla/5.0 (X11; Linux x86_64)", null, 0, "linux"],
    ["Mozilla/5.0 (X11; CrOS x86_64)", null, 0, "linux"],
    ["Tablet", null, 0, "tablet"],
    ["Mobile", null, 0, "mobile"],
  ];
  for (const [ua, plataforma, toques, esperado] of casos) {
    assert.equal(detectarDispositivo(ua, plataforma, toques), esperado, ua);
  }
});

test("preserva registros genéricos e agrupa cada tipo exatamente uma vez", () => {
  const ids = TIPOS_DISPOSITIVOS.map((tipo) => tipo.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual([...ids].sort(), GRUPOS_DISPOSITIVOS.flatMap((grupo) => grupo.valores).sort());
  for (const tipo of TIPOS_DISPOSITIVOS) assert.equal(agruparDispositivo(tipo.id), tipo.grupo);
  assert.deepEqual(contarDispositivos([...ids, null, "desconhecido"].map((dispositivo) => ({ dispositivo }))), {
    celular: 3, computador: 4, tablet: 3, outros: 2,
  });
  assert.deepEqual(contarDispositivos([]), { celular: 0, computador: 0, tablet: 0, outros: 0 });
});
