import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as protocolo from "../src/lib/axxonpay-protocolo.ts";
import * as webhook from "../src/lib/axxonpay-webhook.ts";
import * as cartao from "../src/lib/cartao.ts";

// Executa o serviço real transpilado, com banco/gateway/e-mails substituídos.
// Não usa credenciais, rede, pedidos reais ou cartões de clientes.
function ambiente({ criar, consultar, numeros, provider = "stripe", erroReserva = false, erroUpdate = false, env = { NEXT_PUBLIC_SITE_URL: "https://loja.example" } } = {}) {
  const pedidos = new Map();
  let chamadas = 0, consultas = 0, confirmacoes = 0;
  let numerosSorteados = 0;
  const logs = [];
  const gateway = {
    configuracaoAdquirenteAxxon: async () => ({ publica: "pk_teste", provider, modo: provider === "bloopi" ? "cru" : "token" }),
    criarPagamentoAxxon: async dados => {
      chamadas++;
      return criar ? criar(dados) : { id: "payment_uuid", amount: dados.amount, status: "PENDING", paymentMethod: dados.paymentMethod, metadata: dados.metadata, qrCode: "PIX-FICTICIO" };
    },
    consultarPagamentoAxxon: async id => {
      consultas++;
      const pedido = [...pedidos.values()].find(p => p.pix_id === `axxon_${id}`);
      if (consultar) return consultar(id, pedido, consultas);
      // No PIX real, o GET da adquirente corre em paralelo à persistência do
      // ID. O mock não deve depender da ordem interna dessas duas operações.
      return { id, amount: pedido?.valor_centavos ?? 2500, status: "PENDING", method: pedido?.metodo_pagamento === "cartao" ? "credit_card" : "pix", metadata: { external_reference: pedido?.referencia }, qrCode: "PIX-FICTICIO" };
    },
  };
  class Consulta {
    filtros = []; payload = null;
    select() { return this; }
    eq(campo, valor) { this.filtros.push(p => p[campo] === valor); return this; }
    or(expressao) {
      const termos = expressao.split(",").map(termo => termo.split(".eq."));
      this.filtros.push(p => termos.some(([campo, valor]) => p[campo] === valor));
      return this;
    }
    is(campo, valor) { this.filtros.push(p => (p[campo] ?? null) === valor); return this; }
    update(payload) { this.payload = payload; return this; }
    async insert(payload) {
      if (erroReserva) return { error: { code: "db_offline" } };
      if (pedidos.has(payload.referencia) || [...pedidos.values()].some(p => p.id === payload.id)) return { error: { code: "23505" } };
      pedidos.set(payload.referencia, { ...payload, pix_id: null });
      return { error: null };
    }
    async maybeSingle() {
      if (this.payload && erroUpdate) return { data: null, error: { code: "db_offline" } };
      const p = [...pedidos.values()].find(p => this.filtros.every(f => f(p)));
      if (p && this.payload) Object.assign(p, this.payload);
      return { data: p ? { ...p } : null, error: null };
    }
    then(resolve, reject) { return this.maybeSingle().then(resolve, reject); }
  }
  const dependencias = {
    "server-only": {}, "qrcode": { toDataURL: async () => "data:image/png;base64,TESTE" },
    "./supabase/servidor": { supabaseAdmin: () => ({ from: () => new Consulta() }) },
    "./axxonpay": gateway, "./axxonpay-protocolo": protocolo, "./axxonpay-webhook": webhook, "./cartao": cartao,
    "./numero-pedido": { sortearNumeroPedido: () => numeros ? numeros[numerosSorteados++ % numeros.length] : String(100001 + numerosSorteados++) },
    "./precos": { calcularCarrinhoCafe: () => ({ total: 2500, subtotal: 2500, desconto: 0,
      frete: { centavos: 0, nome: "PAC" }, kit: { nome: "1x Produto teste" }, quantidadeTotal: 1,
      itens: [{ slug: "teste", nome: "Produto teste", quantidade: 1, totalCentavos: 2500 }] }) },
    "./documento-br": { documentoBrasileiroValido: () => true },
    "./confirmar-pedido": { depois: () => {}, confirmarPorEmail: async () => { confirmacoes++; }, registrarCompraNoPixel: async () => {}, enviarPixPorEmail: async () => {} },
    "./entrega-app": { entregarAcessoApp: async () => {} },
  };
  const fonte = readFileSync(new URL("../src/lib/pagamentos-axxon.ts", import.meta.url), "utf8");
  const js = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports, require: id => {
    if (!(id in dependencias)) throw new Error(`Dependência não simulada: ${id}`);
    return dependencias[id];
  }, Response, URL, AbortSignal, console: { error: (...args) => logs.push(JSON.stringify(args)), warn: (...args) => logs.push(JSON.stringify(args)) }, process: { env } });
  return { ...exports, pedidos, pedido: (tentativa = body.tentativa) => [...pedidos.values()].find(p => p.id === tentativa), contadores: () => ({ chamadas, consultas, confirmacoes }), logs: () => logs };
}
const body = {
  tentativa: "550e8400-e29b-41d4-a716-446655440000", loja: "cafecomdeuspai", produto: "teste", qtd: 1, frete: "pac",
  nome: "Cliente Ficticio", email: "teste@example.com", documento: "00000000000", celular: "11999999999",
  endereco: { logradouro: "Rua Teste", numero: "1", bairro: "Centro", localidade: "Cidade", uf: "SP", cep: "12345678" },
};

function pedidoFicticio(referencia, id, pix_id = null) {
  return { referencia, id, pix_id, status: "pendente", valor_centavos: 2500, metodo_pagamento: "pix",
    cliente_nome: body.nome, cliente_documento: body.documento, cliente_email: body.email };
}

test("reenvio mantém os mesmos seis dígitos e não cria outro pagamento", async () => {
  const a = ambiente();
  const primeiraResposta = await a.processarAxxon(body, "pix");
  const primeira = await primeiraResposta.json();
  assert.equal(primeiraResposta.status, 200, JSON.stringify({ primeira, logs: a.logs() }));
  const segunda = await (await a.processarAxxon(body, "pix")).json();
  assert.match(primeira.pedido, /^[1-9]\d{5}$/);
  assert.equal(segunda.pedido, primeira.pedido);
  assert.equal(segunda.id, primeira.id);
  assert.equal(a.contadores().chamadas, 1);
  assert.equal(a.pedidos.get(primeira.pedido).pix_copia_cola, "PIX-FICTICIO");
});
test("colisão de número com outro gateway é resolvida antes da cobrança", async () => {
  const a = ambiente({ numeros: ["123456", "654321"] });
  const antigo = pedidoFicticio("123456", "650e8400-e29b-41d4-a716-446655440000", "pinpay_antigo");
  a.pedidos.set(antigo.referencia, antigo);
  const r = await a.processarAxxon(body, "pix");
  assert.equal(r.status, 200);
  assert.equal((await r.json()).pedido, "654321");
  assert.equal(a.pedidos.get("123456"), antigo);
  assert.equal(a.contadores().chamadas, 1);
});
test("colisões esgotadas não geram cobrança nem número de oito dígitos", async () => {
  const a = ambiente({ numeros: ["123456"] });
  a.pedidos.set("123456", pedidoFicticio("123456", "650e8400-e29b-41d4-a716-446655440000", "pinpay_antigo"));
  assert.equal((await a.processarAxxon(body, "pix")).status, 503);
  assert.equal(a.pedidos.size, 1);
  assert.equal(a.contadores().chamadas, 0);
});
test("pedido legado AXX continua recuperável sem renumeração", async () => {
  const a = ambiente();
  const ref = `AXX-${body.tentativa}`;
  a.pedidos.set(ref, pedidoFicticio(ref, "650e8400-e29b-41d4-a716-446655440000", "axxon_payment_uuid"));
  const r = await a.processarAxxon(body, "pix");
  assert.equal(r.status, 200);
  assert.equal((await r.json()).pedido, ref);
  assert.equal(a.contadores().chamadas, 0);
  assert.equal(a.pedidos.size, 1);
});
test("UUID que pertence a outro gateway não consulta nem cria AxxonPay", async () => {
  const a = ambiente();
  a.pedidos.set("123456", pedidoFicticio("123456", body.tentativa, "pinpay_antigo"));
  assert.equal((await a.processarAxxon(body, "pix")).status, 409);
  assert.equal(a.contadores().chamadas, 0);
  assert.equal(a.contadores().consultas, 0);
});
test("webhook de referência curta exige UUID interno quando falta ID salvo", async () => {
  const a = ambiente();
  a.pedidos.set("123456", pedidoFicticio("123456", body.tentativa));
  const p = { id: "payment_uuid", amount: 2500, status: "PENDING", method: "pix", metadata: { external_reference: "123456" } };
  await assert.rejects(a.sincronizarAxxon(p));
  await assert.rejects(a.sincronizarAxxon({ ...p, metadata: { ...p.metadata, payment_attempt: "650e8400-e29b-41d4-a716-446655440000" } }));
  assert.equal(a.pedido().pix_id, null);
  const r = await a.sincronizarAxxon({ ...p, metadata: { ...p.metadata, payment_attempt: body.tentativa } });
  assert.equal(r.pedido, "123456");
  assert.equal(a.pedido().pix_id, "axxon_payment_uuid");
  assert.equal(a.contadores().confirmacoes, 0);
});

for (const metodo of ["pix", "cartao"]) {
  test(`descrição AxxonPay usa referência real sem alterar produto no pedido (${metodo})`, async () => {
    let enviado;
    const a = ambiente({ criar: async dados => {
      enviado = dados;
      return { id: "payment_uuid", amount: dados.amount, status: "PENDING", paymentMethod: dados.paymentMethod };
    } });
    const resposta = await a.processarAxxon({ ...body, cardHash: "tok_ficticio" }, metodo);
    assert.equal(resposta.status, 200);
    const dados = await resposta.json();
    assert.match(dados.pedido, /^[1-9]\d{5}$/);
    assert.equal(enviado.description, `Café com Deus Pai - 1x Produto teste - Pedido #${dados.pedido}`);
    assert.deepEqual(JSON.parse(JSON.stringify(enviado.customer.address)), {
      street: body.endereco.logradouro, number: body.endereco.numero,
      neighborhood: body.endereco.bairro, city: body.endereco.localidade,
      state: body.endereco.uf.toUpperCase(), zipCode: body.endereco.cep.replace(/\D/g, ""),
    });
    assert.equal(enviado.metadata.external_reference, dados.pedido);
    assert.equal(enviado.metadata.payment_attempt, body.tentativa);
    assert.equal(a.pedidos.get(dados.pedido).id, body.tentativa);
    assert.equal(a.pedidos.get(dados.pedido).kit, "1x Produto teste");
  });
}

test("duas requisições simultâneas criam somente uma cobrança", async () => {
  const a = ambiente();
  const resultados = await Promise.all([a.processarAxxon(body, "pix"), a.processarAxxon(body, "pix")]);
  assert.equal(a.contadores().chamadas, 1);
  assert.equal(resultados[0].status, 200);
  assert.ok([200, 409].includes(resultados[1].status));
  assert.equal(a.pedidos.size, 1);
});
test("timeout não provoca repetição nem fallback", async () => {
  const a = ambiente({ criar: async () => { throw new Error("timeout"); } });
  assert.equal((await a.processarAxxon(body, "pix")).status, 503);
  assert.equal((await a.processarAxxon(body, "pix")).status, 409);
  assert.equal(a.contadores().chamadas, 1);
});
test("criação em reais não é comparada com centavos: confere GET canônico", async () => {
  const a = ambiente({ criar: async () => ({ id: "payment_uuid", amount: 25, status: "PENDING" }) });
  const r = await a.processarAxxon(body, "pix");
  assert.equal(r.status, 200);
  assert.equal((await r.json()).total, 2500);
  assert.equal(a.contadores().chamadas, 1);
});
test("timeout no GET preserva ID e reenvio recupera PIX sem nova cobrança", async () => {
  const a = ambiente({ consultar: async (id, pedido, numero) => {
    assert.equal(pedido.pix_id, `axxon_${id}`, "ID já persistido antes do GET");
    if (numero === 1) throw new Error("timeout");
    return { id, amount: 2500, status: "PENDING", method: "pix", qrCode: "PIX-FICTICIO" };
  } });
  assert.equal((await a.processarAxxon(body, "pix")).status, 503);
  assert.equal(a.pedido().pix_id, "axxon_payment_uuid");
  const recuperado = await a.processarAxxon(body, "pix");
  assert.equal(recuperado.status, 200);
  assert.equal((await recuperado.json()).qr_code, "PIX-FICTICIO");
  assert.equal(a.pedido().pix_copia_cola, "PIX-FICTICIO");
  assert.equal(a.contadores().chamadas, 1);
});
test("valor divergente no GET nunca é aceito, mas preserva ID para conferência", async () => {
  const a = ambiente({ consultar: async id => ({ id, amount: 25, status: "PAID", method: "pix" }) });
  assert.equal((await a.processarAxxon(body, "pix")).status, 503);
  assert.equal((await a.processarAxxon(body, "pix")).status, 503);
  assert.equal(a.pedido().pix_id, "axxon_payment_uuid");
  assert.equal(a.pedido().status, "pendente");
  assert.equal(a.contadores().chamadas, 1);
  assert.equal(a.contadores().confirmacoes, 0);
});
test("PIX pendente sem QR não é apresentado como criação concluída", async () => {
  const a = ambiente({ consultar: async id => ({ id, amount: 2500, status: "PENDING", method: "pix", qrCode: null }) });
  assert.equal((await a.processarAxxon(body, "pix")).status, 503);
  assert.equal((await a.processarAxxon(body, "pix")).status, 503);
  assert.equal(a.contadores().chamadas, 1);
});
test("3DS da criação é preservado mesmo quando GET não devolve nextAction", async () => {
  const nextAction = { type: "CLIENT_CONFIRMATION", provider: "stripe", payload: { paymentId: "payment_uuid", clientSecret: "ficticio" } };
  const a = ambiente({ criar: async () => ({ id: "payment_uuid", nextAction }) });
  const r = await a.processarAxxon({ ...body, cardHash: "tok_ficticio" }, "cartao");
  assert.equal(r.status, 200);
  assert.deepEqual((await r.json()).nextAction, nextAction);
  assert.equal(a.contadores().confirmacoes, 0);
});
test("URL local sem webhook HTTPS falha antes de reservar ou chamar gateway", async () => {
  const a = ambiente({ env: { NEXT_PUBLIC_SITE_URL: "http://localhost:3000" } });
  const r = await a.processarAxxon(body, "pix");
  assert.equal(r.status, 503);
  assert.match((await r.json()).erro, /AXXONPAY_WEBHOOK_URL/);
  assert.equal(a.pedidos.size, 0);
  assert.equal(a.contadores().chamadas, 0);
});
test("checkout local usa webhook HTTPS separado", async () => {
  let enviado;
  const destino = "https://loja.example/api/webhooks/axxonpay";
  const a = ambiente({ env: { NEXT_PUBLIC_SITE_URL: "http://localhost:3000", AXXONPAY_WEBHOOK_URL: destino }, criar: async p => {
    enviado = p;
    return { id: "payment_uuid", amount: p.amount, status: "PENDING" };
  } });
  assert.equal((await a.processarAxxon(body, "pix")).status, 200);
  assert.equal(enviado.postbackUrl, destino);
});
test("documento rejeitado encerra reserva; dados corrigidos usam nova referência", async () => {
  const a = ambiente({ criar: async p => {
    if (p.customer.document.number === body.documento) throw Object.assign(new Error("HTTP 400"), { documentoInvalido: true });
    return { id: "payment_uuid", amount: p.amount, status: "PENDING" };
  } });
  const r = await a.processarAxxon(body, "pix");
  assert.equal((await r.json()).codigo, "TENTATIVA_ENCERRADA_SEM_COBRANCA");
  assert.equal(a.pedido().status, "falhou");
  const corrigido = { ...body, documento: "11111111111" }; // Somente mock, sem rede.
  const antiga = await a.processarAxxon(corrigido, "pix");
  assert.equal((await antiga.json()).codigo, "TENTATIVA_ENCERRADA_SEM_COBRANCA");
  assert.equal(a.contadores().chamadas, 1);
  const nova = await a.processarAxxon({ ...corrigido, tentativa: "650e8400-e29b-41d4-a716-446655440000" }, "pix");
  assert.equal(nova.status, 200);
  assert.equal(a.contadores().chamadas, 2);
  assert.equal(a.pedido().cliente_documento, body.documento);
});
test("falha ao persistir rejeição não libera nova tentativa", async () => {
  const a = ambiente({ erroUpdate: true, criar: async () => { throw Object.assign(new Error("HTTP 400"), { documentoInvalido: true }); } });
  const r = await a.processarAxxon(body, "pix");
  assert.equal(r.status, 503);
  assert.equal((await r.json()).codigo, undefined);
  assert.equal(a.pedido().status, "pendente");
});
for (const comId of [true, false]) {
  test(`dados alterados não liberam cobrança pendente (${comId ? "com ID" : "timeout sem ID"})`, async () => {
    const a = ambiente(comId ? {} : { criar: async () => { throw new Error("timeout"); } });
    await a.processarAxxon(body, "pix");
    const r = await a.processarAxxon({ ...body, documento: "11111111111", email: "outro@example.com" }, "pix");
    const dados = await r.json();
    assert.equal(r.status, 409);
    assert.equal(dados.codigo, undefined);
    assert.match(dados.erro, /alterados/);
    assert.equal(a.contadores().chamadas, 1);
    assert.equal(a.pedido().cliente_documento, body.documento);
  });
}
test("banco indisponível impede cobrança órfã", async () => {
  const a = ambiente({ erroReserva: true });
  assert.equal((await a.processarAxxon(body, "pix")).status, 503);
  assert.equal(a.contadores().chamadas, 0);
});
// Número de teste público (Luhn válido), nunca um cartão real.
const cartaoTeste = { numero: "4111 1111 1111 1111", titular: "Cliente  Ficticio", mes: 12, ano: 2035, cvv: "123" };
const vazouCartao = /4111|1111|"cvv"|Ficticio.{0,40}123/;

test("campos antigos de cartão são rejeitados antes de gravar ou chamar gateway", async () => {
  const a = ambiente();
  for (const extra of [{ card: { number: "TESTE" }, cardHash: "tok_teste" }, { numeroCartao: "1" }, { cvv: "123", cartao: cartaoTeste }, { chaveAtivacao: "x" }]) {
    assert.equal((await a.processarAxxon({ ...body, ...extra }, "cartao")).status, 400);
  }
  assert.equal((await a.processarAxxon({ ...body, cartao: cartaoTeste }, "pix")).status, 400, "PIX não recebe cartão");
  assert.equal(a.contadores().chamadas, 0);
  assert.equal(a.pedidos.size, 0);
});
test("adquirente tokenizada: somente o hash segue para o gateway e nunca para o banco", async () => {
  let enviado;
  const a = ambiente({ criar: async p => { enviado = p; return { id: "payment_uuid", amount: 2500, status: "PENDING", paymentMethod: "credit_card" }; } });
  assert.equal((await a.processarAxxon({ ...body, cardHash: "tok_ficticio", installments: 2, amount: 1 }, "cartao")).status, 200);
  assert.equal(enviado.amount, 2500);
  assert.equal(JSON.stringify(enviado.card), JSON.stringify({ hash: "tok_ficticio" }));
  assert.doesNotMatch(JSON.stringify([...a.pedidos.values()]), /tok_ficticio|cardHash/);
});
test("Bloopi: cartão validado segue só para a criação, nunca para banco, log ou resposta", async () => {
  let enviado;
  const nextAction = { type: "CLIENT_CONFIRMATION", provider: "bloopi", payload: { externalPaymentId: "pi_x", clientSecret: "segredo-3ds" } };
  const a = ambiente({ provider: "bloopi", criar: async p => { enviado = p; return { id: "payment_uuid", amount: 2500, status: "PENDING", paymentMethod: "credit_card", nextAction }; } });
  const r = await a.processarAxxon({ ...body, cartao: cartaoTeste, installments: 3 }, "cartao");
  assert.equal(r.status, 200);
  const resposta = await r.text();
  assert.deepEqual(enviado.card, { number: "4111111111111111", holderName: "Cliente Ficticio", expirationMonth: 12, expirationYear: 2035, cvv: "123" });
  assert.equal(enviado.installments, 3);
  assert.equal(enviado.paymentMethod, "credit_card");
  assert.match(resposta, /segredo-3ds/, "nextAction segue intacto ao navegador");
  assert.doesNotMatch(resposta, vazouCartao);
  assert.doesNotMatch(JSON.stringify([...a.pedidos.values()]), vazouCartao);
  assert.doesNotMatch(a.logs().join(" "), vazouCartao);
  assert.equal(a.pedido().metodo_pagamento, "cartao");
  assert.equal(a.pedido().pix_id, "axxon_payment_uuid");
});
test("cartão acima de 4x envia e registra o total com juros", async () => {
  let enviado;
  const nextAction = { type: "CLIENT_CONFIRMATION", provider: "bloopi", payload: { externalPaymentId: "pi_x", clientSecret: "segredo-3ds" } };
  const a = ambiente({ provider: "bloopi", criar: async p => { enviado = p; return { id: "payment_uuid", nextAction }; } });
  const r = await a.processarAxxon({ ...body, cartao: cartaoTeste, installments: 5 }, "cartao");
  assert.equal(r.status, 200);
  assert.equal(enviado.amount, 3125, "5x acrescenta 25% aos 2500 centavos");
  assert.equal((await r.json()).total, 3125);
  assert.equal(a.pedido().valor_centavos, 3125);
  assert.equal(a.pedido().subtotal_centavos, 2500);
});
test("Bloopi: falha do gateway registra só referência/etapa/HTTP, nunca o cartão", async () => {
  const a = ambiente({ provider: "bloopi", criar: async () => { throw Object.assign(new Error("HTTP 500"), { status: 500 }); } });
  const r = await a.processarAxxon({ ...body, cartao: cartaoTeste }, "cartao");
  assert.equal(r.status, 503);
  assert.doesNotMatch(await r.text(), vazouCartao);
  assert.equal(a.logs().length, 1);
  assert.match(a.logs()[0], /"etapa":"criacao"/);
  assert.match(a.logs()[0], /"http":500/);
  assert.doesNotMatch(a.logs()[0], vazouCartao);
  assert.equal(a.pedido().status, "pendente", "indeterminado: preserva para conferência");
});
test("Bloopi: recusa 400 sem ID encerra a reserva e libera nova tentativa", async () => {
  const a = ambiente({ provider: "bloopi", criar: async () => { throw Object.assign(new Error("HTTP 400"), { status: 400, cartaoRecusado: true }); } });
  const r = await a.processarAxxon({ ...body, cartao: cartaoTeste }, "cartao");
  assert.equal(r.status, 409);
  const dados = await r.json();
  assert.equal(dados.codigo, "TENTATIVA_ENCERRADA_SEM_COBRANCA");
  assert.match(dados.erro, /cartão não foi aceito/);
  assert.equal(a.pedido().status, "falhou");
  assert.equal(a.pedido().pix_id, null);
  assert.doesNotMatch(a.logs().join(" "), vazouCartao);
});
test("Bloopi: consulta com method \"card\" conclui a criação e o webhook aprova o pedido", async () => {
  const nextAction = { type: "CLIENT_CONFIRMATION", provider: "bloopi", payload: { externalPaymentId: "pi_x", clientSecret: "segredo-3ds" } };
  const a = ambiente({ provider: "bloopi",
    criar: async p => ({ id: "payment_uuid", amount: p.amount, status: "PENDING", paymentMethod: "credit_card", nextAction }),
    consultar: (id, pedido) => ({ id, amount: 2500, status: pedido?.status === "aprovado" ? "PAID" : "PENDING", method: "card", currency: "BRL" }) });
  const r = await a.processarAxxon({ ...body, cartao: cartaoTeste }, "cartao");
  assert.equal(r.status, 200);
  const dados = await r.json();
  assert.equal(dados.nextAction.payload.clientSecret, "segredo-3ds");
  assert.equal(a.pedido().status, "pendente");
  assert.equal(a.contadores().consultas, 0, "abre o 3DS sem bloquear no GET canônico");
  // Webhook/polling: a API confirma com method "card" e PAID.
  const sync = await a.sincronizarAxxon({ id: "payment_uuid", amount: 2500, status: "PAID", method: "card", confirmedAt: "2026-09-09T05:30:00.000Z" });
  assert.equal(sync.status, "approved");
  assert.equal(a.pedido().status, "aprovado");
  assert.equal(a.contadores().confirmacoes, 1);
});
test("cartão pendente sem 3DS reenviável libera nova tentativa sem tocar na cobrança antiga", async () => {
  // Cenário real: criação ok, resposta perdida (503), navegador reenvia a mesma tentativa.
  const a = ambiente({ provider: "bloopi", consultar: id => ({ id, amount: 2500, status: "PENDING", method: "card" }) });
  a.pedidos.set("305591", { ...pedidoFicticio("305591", body.tentativa, "axxon_payment_uuid"), metodo_pagamento: "cartao" });
  const r = await a.processarAxxon({ ...body, cartao: cartaoTeste }, "cartao");
  assert.equal(r.status, 409);
  const dados = await r.json();
  assert.equal(dados.codigo, "TENTATIVA_ENCERRADA_SEM_COBRANCA");
  assert.equal(dados.renovar, true, "o navegador pode renovar uma única vez no mesmo clique");
  assert.match(dados.erro, /nova tentativa/);
  assert.equal(a.contadores().chamadas, 0, "não cria outra cobrança para a mesma tentativa");
  assert.equal(a.pedidos.get("305591").status, "pendente", "a cobrança antiga expira no gateway; não é marcada à força");
  assert.equal(a.pedidos.get("305591").pix_id, "axxon_payment_uuid");
  // Já aprovada (webhook chegou entre uma requisição e outra): devolve a aprovação, nunca libera.
  const b = ambiente({ provider: "bloopi", consultar: id => ({ id, amount: 2500, status: "PAID", method: "card" }) });
  b.pedidos.set("305591", { ...pedidoFicticio("305591", body.tentativa, "axxon_payment_uuid"), metodo_pagamento: "cartao" });
  const rb = await b.processarAxxon({ ...body, cartao: cartaoTeste }, "cartao");
  assert.equal(rb.status, 200);
  assert.equal((await rb.json()).status, "approved");
  // Com nextAction disponível na consulta, o navegador ainda pode concluir o 3DS: não libera.
  const c = ambiente({ provider: "bloopi", consultar: id => ({ id, amount: 2500, status: "PENDING", method: "card", nextAction: { type: "CLIENT_CONFIRMATION", payload: {} } }) });
  c.pedidos.set("305591", { ...pedidoFicticio("305591", body.tentativa, "axxon_payment_uuid"), metodo_pagamento: "cartao" });
  assert.equal((await c.processarAxxon({ ...body, cartao: cartaoTeste }, "cartao")).status, 200);
});
test("formato do cartão precisa bater com a adquirente atual", async () => {
  for (const [provider, extra] of [["bloopi", { cardHash: "tok_ficticio" }], ["stripe", { cartao: cartaoTeste }]]) {
    const a = ambiente({ provider });
    assert.equal((await a.processarAxxon({ ...body, ...extra }, "cartao")).status, 409, provider);
    assert.equal(a.contadores().chamadas, 0);
    assert.equal(a.pedidos.size, 0);
  }
  const outra = ambiente({ provider: "desconhecida" });
  outra.pedidos.clear();
});
test("cartão inválido é recusado antes da reserva, sem chamar a adquirente", async () => {
  for (const invalido of [{ ...cartaoTeste, numero: "4111111111111112" }, { ...cartaoTeste, ano: 2020 }, { ...cartaoTeste, mes: 13 }, { ...cartaoTeste, cvv: "12" }, { ...cartaoTeste, titular: "" }, "texto", null]) {
    const a = ambiente({ provider: "bloopi" });
    const r = await a.processarAxxon({ ...body, cartao: invalido }, "cartao");
    assert.equal(r.status, 422, JSON.stringify(invalido));
    assert.doesNotMatch(await r.text(), /4111/);
    assert.equal(a.contadores().chamadas, 0);
    assert.equal(a.pedidos.size, 0);
  }
  const a = ambiente({ provider: "bloopi" });
  assert.equal((await a.processarAxxon({ ...body, cartao: cartaoTeste, installments: 13 }, "cartao")).status, 422, "parcelas acima do limite");
  assert.equal((await a.processarAxxon({ ...body, cartao: cartaoTeste, endereco: { ...body.endereco, cep: "11111111" } }, "cartao")).status, 422, "CEP repetido não passa no 3DS");
  assert.equal(a.pedidos.size, 0);
});
test("aprovação repetida é idempotente e evento antigo não desfaz aprovação/estorno", async () => {
  const a = ambiente();
  await a.processarAxxon(body, "pix");
  const p = { id: "payment_uuid", amount: 2500, status: "PAID", method: "pix" };
  await a.sincronizarAxxon(p);
  await a.sincronizarAxxon(p);
  await a.sincronizarAxxon({ ...p, status: "PENDING" });
  assert.equal([...a.pedidos.values()][0].status, "aprovado");
  assert.equal(a.contadores().confirmacoes, 1);
  await a.sincronizarAxxon({ ...p, status: "REFUNDED" });
  await a.sincronizarAxxon(p);
  assert.equal([...a.pedidos.values()][0].status, "estornado");
  assert.equal(a.contadores().confirmacoes, 1);
});
