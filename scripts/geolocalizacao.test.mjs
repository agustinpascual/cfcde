import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isIP } from "node:net";
import vm from "node:vm";
import ts from "typescript";

function modulo(arquivo, dependencias, globals = {}) {
  const exports = {};
  const js = ts.transpileModule(readFileSync(new URL(arquivo, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(js, { exports, console, Response, AbortSignal, ...globals, require(id) {
    if (id in dependencias) return dependencias[id];
    throw new Error(`Dependência não autorizada: ${id}`);
  } });
  return exports;
}

const resultado = { city: "São Paulo", region: "Sao Paulo", country_code: "BR", latitude: "-23.55", longitude: "-46.63" };
function carregarGeo(fetch = async () => Response.json(resultado), globals = {}) {
  return modulo("../src/lib/geolocalizacao.ts", { "server-only": {}, "node:net": { isIP } }, { fetch, ...globals });
}

test("headers ausentes, vazios e inválidos não viram coordenadas 0,0", () => {
  const geo = carregarGeo();
  for (const valores of [{}, { "cf-iplatitude": "", "cf-iplongitude": "" },
    { "cf-iplatitude": "91", "cf-iplongitude": "-46" },
    { "cf-iplatitude": "0", "cf-iplongitude": "0" },
    { "cf-iplatitude": "-23", "cf-iplongitude": "NaN" }]) {
    const local = geo.localizacaoDosHeaders(new Headers(valores));
    assert.equal(local.latitude, null);
    assert.equal(local.longitude, null);
    assert.deepEqual(Object.keys(geo.camposLocalizacao(local)), []);
  }
  assert.equal(geo.localizacaoDosHeaders(new Headers({ "cf-iplatitude": "0", "cf-iplongitude": "-51" })).latitude, 0);
});

test("preserva Cloudflare e Vercel, decodifica cidade e normaliza UF brasileira", () => {
  const geo = carregarGeo();
  for (const h of [
    { "cf-ipcity": "S%C3%A3o%20Paulo", "cf-region-code": "SP", "cf-ipcountry": "BR", "cf-iplatitude": "-23.55", "cf-iplongitude": "-46.63" },
    { "x-vercel-ip-city": "S%C3%A3o%20Paulo", "x-vercel-ip-country-region": "SP", "x-vercel-ip-country": "BR", "x-vercel-ip-latitude": "-23.55", "x-vercel-ip-longitude": "-46.63" },
  ]) {
    const local = geo.localizacaoDosHeaders(new Headers(h));
    assert.equal(local.cidade, "São Paulo");
    assert.equal(local.uf, "SP");
    assert.equal(geo.localizacaoCompleta(local), true);
  }
});

test("consulta somente IPs públicos e não segue URLs ou endereços de rede interna", async () => {
  let chamadas = 0;
  const geo = carregarGeo(async () => { chamadas++; return Response.json(resultado); });
  for (const ip of ["desconhecido", "localhost", "https://localhost", "127.0.0.1", "10.0.0.1", "172.16.1.1", "192.168.1.1", "100.64.0.1", "169.254.169.254", "::1", "fc00::1", "fe80::1", "::ffff:127.0.0.1", "2001:db8::1", "203.0.113.1"]) {
    assert.equal(await geo.localizarIp(ip), null, ip);
  }
  assert.equal(chamadas, 0);
  assert.equal(geo.ipPublico("8.8.8.8"), true);
  assert.equal(geo.ipPublico("2606:4700:4700::1111"), true);
});

test("VPS consulta uma vez por IP, reutiliza cache e deduplica chamadas simultâneas", async () => {
  const chamadas = [];
  const geo = carregarGeo(async (url, options) => { chamadas.push({ url, options }); return Response.json(resultado); });
  const locais = await Promise.all(Array.from({ length: 10 }, () => geo.localizarIp("8.8.8.8")));
  assert.equal(locais[0].uf, "SP");
  assert.equal(locais[0].latitude, -23.55);
  await geo.localizarIp("8.8.8.8");
  assert.equal(chamadas.length, 1);
  assert.equal(chamadas[0].url, "https://get.geojs.io/v1/ip/geo/8.8.8.8.json");
  assert.equal(chamadas[0].options.cache, "no-store");
  assert.equal(chamadas[0].options.redirect, "error");
  assert.ok(chamadas[0].options.signal instanceof AbortSignal);
});

test("falha, timeout e resposta inválida têm cache curto e não derrubam rastreamento", async () => {
  for (const resposta of [() => { throw new Error("timeout"); }, () => new Response("indisponível", { status: 503 }), () => new Response("<html>"), () => Response.json({ error: "IP not found" })]) {
    let chamadas = 0;
    let agora = 1000;
    const geo = carregarGeo(async () => { chamadas++; return resposta(); }, { Date: { now: () => agora } });
    assert.equal(await geo.localizarIp("8.8.8.8"), null);
    assert.equal(await geo.localizarIp("8.8.8.8"), null);
    assert.equal(chamadas, 1);
    agora += 60_001;
    await geo.localizarIp("8.8.8.8");
    assert.equal(chamadas, 2);
  }
});

test("cache tem teto de 2048 IPs e expira sem criar arquivos", async () => {
  let agora = 1000;
  const geo = carregarGeo(undefined, { Date: { now: () => agora } });
  for (let i = 0; i < 2049; i++) await geo.localizarIp(`11.0.${Math.floor(i / 256)}.${i % 256}`);
  assert.equal(geo.localizacaoEmCache("11.0.0.0"), undefined);
  assert.equal(geo.localizacaoEmCache("11.0.8.0").uf, "SP");
  agora += 6 * 60 * 60_000;
  assert.equal(geo.localizacaoEmCache("11.0.8.0"), undefined);
});

function rota({ geo = carregarGeo(), ip = "8.8.8.8", erroSessao = null, semColunaIp = false } = {}) {
  const linhas = [], atualizacoes = [], tarefas = [], eventos = [];
  const db = { from() { return {
    async upsert(linha) { linhas.push(linha); return { error: semColunaIp && "ip" in linha ? { code: "42703", message: "column ip does not exist" } : erroSessao }; },
    async insert(linha) { eventos.push(linha); return { error: null }; },
    update(campos) {
      const filtros = [];
      const consulta = { eq(...filtro) { filtros.push(filtro); return consulta; }, then(resolve) { atualizacoes.push({ campos, filtros }); return Promise.resolve({ error: null }).then(resolve); } };
      return consulta;
    },
  }; } };
  const api = modulo("../src/app/api/track/route.ts", {
    "next/server": { NextResponse: Response, after: tarefa => tarefas.push(tarefa) },
    "@/lib/limite": { excedeu: () => false, ipDe: () => ip },
    "@/lib/supabase/servidor": { supabaseAdmin: () => db },
    "@/lib/dispositivos": { detectarDispositivo: () => "android" },
    "@/lib/corpo-json": { ErroCorpo: class extends Error {}, lerJsonObjeto: req => req.json() },
    "@/lib/geolocalizacao": geo,
  });
  return { ...api, linhas, atualizacoes, tarefas, eventos };
}
const req = (headers = {}, pagina = "/", tipo = "pageview") => new Request("https://loja.example/api/track", {
  method: "POST", headers, body: JSON.stringify({ sessao: "teste", pagina, tipo }),
});

test("track responde e grava evento antes da consulta; heartbeat usa cache sem outra atualização", async () => {
  let consultas = 0;
  const api = rota({ geo: carregarGeo(async () => { consultas++; return Response.json(resultado); }) });
  const resposta = await api.POST(req());
  assert.equal(resposta.status, 200);
  assert.equal(consultas, 0);
  assert.equal(api.eventos.length, 1);
  assert.equal("latitude" in api.linhas[0], false);
  assert.equal("cidade" in api.linhas[0], false);
  await api.tarefas[0]();
  assert.equal(consultas, 1);
  assert.equal(api.atualizacoes[0].campos.uf, "SP");
  assert.deepEqual(api.atualizacoes[0].filtros, [["sessao", "teste"], ["ip", "8.8.8.8"]]);
  await api.POST(req({}, "/", "heartbeat"));
  assert.equal(api.linhas[1].cidade, "São Paulo");
  assert.equal(api.linhas[1].latitude, -23.55);
  assert.equal(api.eventos.length, 1);
  assert.equal(api.tarefas.length, 1);
});

test("consulta indisponível preserva localização anterior, sessão e eventos", async () => {
  const api = rota({ geo: carregarGeo(async () => { throw new Error("offline"); }) });
  assert.equal((await api.POST(req())).status, 200);
  await api.tarefas[0]();
  assert.equal(api.atualizacoes.length, 0);
  await api.POST(req());
  assert.equal(api.linhas.length, 2);
  assert.equal("cidade" in api.linhas[1], false);
  assert.equal(api.tarefas.length, 1);
});

test("headers completos dispensam provedor externo; administrador não é rastreado", async () => {
  const api = rota();
  await api.POST(req({ "cf-ipcity": "Curitiba", "cf-region-code": "PR", "cf-ipcountry": "BR", "cf-iplatitude": "-25.4", "cf-iplongitude": "-49.2" }));
  assert.equal(api.linhas[0].cidade, "Curitiba");
  assert.equal(api.tarefas.length, 0);
  const privado = await api.POST(req({}, "/ioh3j4ciof3n3oic"));
  assert.equal(privado.status, 202);
  assert.equal(api.linhas.length, 1);
});

test("banco antigo sem coluna IP continua gravando e falha de sessão não agenda geolocalização", async () => {
  const antiga = rota({ semColunaIp: true });
  assert.equal((await antiga.POST(req())).status, 200);
  assert.equal(antiga.linhas.length, 2);
  assert.equal("ip" in antiga.linhas[1], false);
  await antiga.tarefas[0]();
  assert.equal(antiga.atualizacoes[0].filtros[1][0], "visto_em");
  const falha = rota({ erroSessao: { code: "42P01", message: "tabela inexistente" } });
  assert.equal((await falha.POST(req())).status, 202);
  assert.equal(falha.tarefas.length, 0);
});
