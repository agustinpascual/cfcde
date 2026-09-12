import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as crypto from "node:crypto";

function modulo(path, deps = {}, env = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, Buffer, Response, Request, File, FormData, Uint8Array, Date, console,
    process: { env }, require: id => {
      if (id === "server-only") return {};
      if (id === "node:crypto") return crypto;
      if (!(id in deps)) throw Error(`Dependência não simulada: ${id}`);
      return deps[id];
    } });
  return exports;
}
const tokens = modulo("../src/lib/pix-comprovante-token.ts", {}, { CHAVE_MESTRA: "segredo-ficticio-apenas-para-testes-123456789" });
const validacao = modulo("../src/lib/pix-comprovante-validacao.ts");
const pixId = "axxon_transacao-teste";
const pedido = { id: "f0739623-d520-42e3-872e-1e935388806b", status: "pendente", cliente_nome: "José Teste", valor_centavos: 1234, criado_em: new Date(Date.now() - 3600000).toISOString() };
const token = tokens.criarTokenComprovante(pixId, "192.0.2.1");
const ctx = { params: Promise.resolve({ id: pixId }) };

function setup(options = {}) {
  const writes = [], uploads = [], removals = [];
  let reads = 0;
  const db = {
    from(table) {
      reads++;
      const query = { select() { return this; }, eq() { return this; },
        async maybeSingle() { return table === "pedidos" ? { data: options.noOrder ? null : { ...pedido, status: options.status ?? pedido.status } }
          : { data: options.existing ? { recebido_em: "2026-09-12T12:00:00Z" } : null, error: options.readError ? {} : null }; },
        async insert(row) { assert.equal(table, "pix_comprovantes"); writes.push(row); return { error: options.insertError ?? null }; },
        update() { throw Error("Comprovante não pode alterar o pagamento!"); },
      };
      return query;
    },
    storage: { from(bucket) { assert.equal(bucket, "pix-comprovantes"); return {
      async upload(path, bytes, opts) { uploads.push({ path, bytes, opts }); return { error: options.uploadError ? {} : null }; },
      async remove(paths) { removals.push(paths); return {}; },
      async download() { return { data: new Blob(["arquivo teste"]), error: null }; },
    }; } },
  };
  const route = modulo("../src/app/api/pix/[id]/comprovante/route.ts", {
    "@/lib/supabase/servidor": { supabaseAdmin: () => db },
    "@/lib/pix-comprovante-token": tokens,
    "@/lib/pix-comprovante-validacao": validacao,
    "@/lib/limite": { ipDe: () => options.ip ?? "192.0.2.1", excedeu: () => Boolean(options.limited) },
    "@/lib/mesma-origem": { mesmaOrigem: () => !options.crossOrigin },
  });
  return { route, writes, uploads, removals, db, reads: () => reads };
}
function request({ auth = token, body, get = false } = {}) {
  return new Request(`https://loja.example/api/pix/${pixId}/comprovante`, {
    method: get ? "GET" : "POST", headers: { Authorization: `Bearer ${auth}`, Origin: "https://loja.example",
      ...(body instanceof Uint8Array ? { "Content-Type": "multipart/form-data; boundary=teste" } : {}) },
    ...(get ? {} : { body: body ?? form() }),
  });
}
function form({ type = "application/pdf", bytes = "%PDF-1.4\nconteudo ficticio" } = {}) {
  const f = new FormData();
  f.set("arquivo", new File([bytes], "../../nao-usar-este-nome.pdf", { type }));
  return f;
}

test("token é limitado à cobrança, prazo e assinatura; IP diferente não bloqueia cliente", () => {
  const now = Date.now();
  const t = tokens.criarTokenComprovante(pixId, "192.0.2.1", now);
  assert.equal(tokens.validarTokenComprovante(t, pixId, "192.0.2.1", now).mesmoIp, true);
  assert.equal(tokens.validarTokenComprovante(t, pixId, "192.0.2.2", now).mesmoIp, false);
  assert.equal(tokens.validarTokenComprovante(t, "outro-pix", "192.0.2.1", now), null);
  assert.equal(tokens.validarTokenComprovante(t + "x", pixId, "192.0.2.1", now), null);
  assert.equal(tokens.validarTokenComprovante(t, pixId, "192.0.2.1", now + 8 * 86400000), null);
  assert.equal(tokens.validarTokenComprovante(t, pixId, "desconhecido", now).mesmoIp, null);
  assert.ok(!t.includes("192.0.2.1"));
  assert.equal(modulo("../src/lib/pix-comprovante-token.ts").criarTokenComprovante(pixId, "192.0.2.1"), undefined);
});
test("metadados divergentes nunca são tratados como confirmação", () => {
  const r = validacao.compararComprovante({ nome: "Outro Nome", valor: 1, horario: "2000-01-01T00:00:00Z" }, pedido);
  assert.equal(r.nome_compativel, false); assert.equal(r.valor_compativel, false); assert.equal(r.horario_compativel, false);
  assert.equal(validacao.compararComprovante({ nome: " JOSE  TESTE ", valor: 1234, horario: new Date().toISOString() }, pedido).nome_compativel, true);
  assert.equal(r.status, undefined);
});
test("tipo real rejeita HTML/SVG e aceita assinaturas de imagem e PDF", () => {
  assert.equal(validacao.tipoComprovante(Buffer.from("<svg>fake image</svg>")), null);
  assert.equal(validacao.tipoComprovante(Buffer.from("%PDF-1.4\nconteudo")), "application/pdf");
  assert.equal(validacao.tipoComprovante(Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0])), "image/png");
  assert.equal(validacao.tipoComprovante(Buffer.from([255,216,255,0,0,0,0,0,0,0,0,0])), "image/jpeg");
  assert.equal(validacao.tipoComprovante(Buffer.from("RIFF0000WEBPtest")), "image/webp");
});
test("upload guarda arquivo privado e comparação sem escrever em pedidos", async () => {
  const s = setup();
  assert.equal((await s.route.POST(request(), ctx)).status, 201);
  assert.equal(s.writes.length, 1); assert.equal(s.writes[0].mesmo_ip, true);
  assert.equal(s.writes[0].nome_informado, null); assert.equal(s.writes[0].valor_informado, null);
  assert.equal(s.writes[0].horario_informado, null); assert.equal(s.writes[0].nome_compativel, null);
  assert.equal(s.writes[0].valor_compativel, null); assert.equal(s.writes[0].horario_compativel, null);
  assert.equal(s.writes[0].status, undefined);
  assert.equal(s.writes[0].pago_em, undefined); assert.equal(s.uploads[0].opts.upsert, false);
  assert.ok(s.uploads[0].path.startsWith(pedido.id + "/"));
  assert.ok(!s.uploads[0].path.includes("nao-usar"));
});
test("token inválido, origem externa e limitador não escrevem nem enviam mídia", async () => {
  for (const [options, auth, status] of [[{}, "invalido", 403], [{ crossOrigin: true }, token, 403], [{ limited: true }, token, 429]]) {
    const s = setup(options);
    assert.equal((await s.route.POST(request({ auth }), ctx)).status, status);
    assert.equal(s.uploads.length, 0); assert.equal(s.reads(), 0);
  }
});
test("pedido inexistente ou finalizado não aceita comprovante", async () => {
  for (const options of [{ noOrder: true }, { status: "aprovado" }, { status: "estornado" }]) {
    const s = setup(options);
    assert.equal((await s.route.POST(request(), ctx)).status, options.noOrder ? 404 : 409);
    assert.equal(s.uploads.length, 0);
  }
});
test("requisição repetida mantém o primeiro arquivo sem duplicar", async () => {
  const s = setup({ existing: true });
  assert.equal((await s.route.POST(request(), ctx)).status, 200);
  assert.equal(s.uploads.length, 0); assert.equal(s.writes.length, 0);
});
test("falhas de banco/storage são recuperáveis e não reportam sucesso falso", async () => {
  for (const options of [{ readError: true }, { uploadError: true }, { insertError: { code: "XX" } }]) {
    const s = setup(options);
    assert.equal((await s.route.POST(request(), ctx)).status, 503);
    if (options.insertError) assert.equal(s.removals[0][0], s.uploads[0].path);
  }
});
test("corrida de envios remove somente o arquivo desta requisição", async () => {
  const s = setup({ insertError: { code: "23505" } });
  assert.equal((await s.route.POST(request(), ctx)).status, 200);
  assert.equal(s.removals.length, 1); assert.equal(s.removals[0][0], s.uploads[0].path);
});
test("arquivo falso e tamanho excessivo não chegam ao storage", async () => {
  for (const [body, status] of [[form({ bytes: "<html>fraude</html>" }), 415], [form({ type: "image/png" }), 415],
    [new Uint8Array(validacao.LIMITE_COMPROVANTE + 100000), 413]]) {
    const s = setup();
    assert.equal((await s.route.POST(request({ body }), ctx)).status, status);
    assert.equal(s.uploads.length, 0);
  }
});
test("consulta do cliente devolve somente existência e horário, não mídia nem nome", async () => {
  const s = setup({ existing: true });
  const r = await s.route.GET(request({ get: true }), ctx);
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.deepEqual(Object.keys(await r.json()).sort(), ["enviado", "recebido_em"]);
});
test("download exige admin autenticado e não consulta banco em caso de recusa", async () => {
  const media = modulo("../src/app/api/painel/pedidos/[id]/comprovante/route.ts", {
    "@/lib/painel-auth": { autenticado: async () => false },
    "@/lib/supabase/servidor": { supabaseAdmin() { throw Error("Não consultar sem login"); } },
    "@/lib/pix-comprovante-validacao": validacao,
  });
  const r = await media.GET(request({ get: true }), { params: Promise.resolve({ id: pedido.id }) });
  assert.equal(r.status, 401); assert.equal(r.headers.get("cache-control"), "private, no-store");
});

test("mídia do admin é privada, PDF baixa como anexo e caminho de outro pedido é recusado", async () => {
  for (const [mime, path, status] of [["application/pdf", `${pedido.id}/arquivo`, 200],
    ["image/png", `${pedido.id}/arquivo`, 200], ["text/html", `${pedido.id}/arquivo`, 404],
    ["image/png", "outro-pedido/arquivo", 404]]) {
    let downloads = 0;
    const media = modulo("../src/app/api/painel/pedidos/[id]/comprovante/route.ts", {
      "@/lib/painel-auth": { autenticado: async () => true },
      "@/lib/pix-comprovante-validacao": validacao,
      "@/lib/supabase/servidor": { supabaseAdmin: () => ({
        from: () => ({ select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: { mime, arquivo_path: path } }) }),
        storage: { from: () => ({ download: async () => { downloads++; return { data: new Blob(["arquivo de teste"]) }; } }) },
      }) },
    });
    const r = await media.GET(request({ get: true }), { params: Promise.resolve({ id: pedido.id }) });
    assert.equal(r.status, status);
    assert.equal(downloads, status === 200 ? 1 : 0);
    if (status === 200) {
      assert.equal(r.headers.get("cache-control"), "private, no-store");
      assert.equal(r.headers.get("x-content-type-options"), "nosniff");
      assert.ok(r.headers.get("content-security-policy").includes("sandbox"));
      assert.equal(r.headers.get("content-disposition").startsWith("attachment"), mime === "application/pdf");
    }
  }
});
