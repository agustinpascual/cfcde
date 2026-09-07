import { NextResponse } from "next/server";
import { ler } from "@/lib/config-integracoes";
import { autenticado } from "@/lib/painel-auth";
import { paresConfigurados } from "@/lib/meta-capi";
import { contaPinpay, verificarCredencial } from "@/lib/pinpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Testa uma integração de verdade, do servidor, e diz o que aconteceu.
   Sem isto a única forma de saber se uma chave está certa é esperar uma
   venda real falhar. */

const LIMITE_MS = 20_000;

async function testarCorreios() {
  const [url, segredo] = await Promise.all([ler("CORREIOS_URL"), ler("CORREIOS_SECRET")]);
  if (!url) return { ok: false, detalhe: "CORREIOS_URL não configurada." };
  if (!segredo) return { ok: false, detalhe: "CORREIOS_SECRET não configurado." };

  /* pedido_id marcado como teste: se o endpoint criar mesmo a encomenda,
     ela fica identificável e não se confunde com uma venda. */
  const pedidoTeste = `TESTE-${Date.now().toString(36).toUpperCase()}`;
  const corta = new AbortController();
  const relogio = setTimeout(() => corta.abort(), LIMITE_MS);

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-integration-secret": segredo },
      body: JSON.stringify({
        pedido_id: pedidoTeste,
        status_pagamento: "pago",
        destino: { cidade: "Sao Paulo", uf: "SP" },
      }),
      signal: corta.signal,
    });
    const texto = await r.text();

    if (r.status === 401 || r.status === 403) {
      return { ok: false, http: r.status, detalhe: "Segredo recusado — confira o CORREIOS_SECRET.", resposta: texto.slice(0, 200) };
    }
    if (!r.ok) {
      return { ok: false, http: r.status, detalhe: "O endpoint recusou a requisição.", resposta: texto.slice(0, 200) };
    }

    let corpo: { codigo?: string; criado?: boolean };
    try { corpo = JSON.parse(texto); } catch {
      return { ok: false, http: r.status, detalhe: "Respondeu algo que não é JSON.", resposta: texto.slice(0, 200) };
    }
    if (!corpo.codigo) {
      return { ok: false, http: r.status, detalhe: "Respondeu sem o campo `codigo`.", resposta: texto.slice(0, 200) };
    }
    return {
      ok: true, http: r.status,
      detalhe: `Encomenda de teste criada. Código: ${corpo.codigo}`,
      codigo: corpo.codigo, pedidoTeste,
    };
  } catch (e) {
    const err = e as Error;
    return {
      ok: false,
      detalhe: err.name === "AbortError"
        ? `O endpoint não respondeu em ${LIMITE_MS / 1000}s.`
        : `Não foi possível conectar: ${err.message.slice(0, 120)}`,
    };
  } finally {
    clearTimeout(relogio);
  }
}

async function testarPinpay() {
  try {
    await verificarCredencial();
    /* Mostrar de QUAL conta é a credencial: já aconteceu de a chave salva no
       painel ser de uma conta e a do ambiente de outra, e nada denunciava —
       as cobranças iam para um lugar e as consultas para outro. */
    const conta = await contaPinpay();
    return {
      ok: true,
      detalhe: `Credencial aceita. Conta: ${conta.name ?? "?"} · ${conta.email ?? "?"} · ambiente ${conta.environment ?? "?"}`,
      conta: { nome: conta.name, email: conta.email, ambiente: conta.environment },
    };
  } catch (e) {
    return { ok: false, detalhe: (e as Error).message.slice(0, 200) };
  }
}

async function testarResend() {
  const [chave, remetente] = await Promise.all([ler("RESEND_API_KEY"), ler("RESEND_REMETENTE")]);
  if (!chave) return { ok: false, detalhe: "RESEND_API_KEY não configurada." };
  if (!remetente) return { ok: false, detalhe: "RESEND_REMETENTE não configurado." };
  const r = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${chave}` } });
  if (!r.ok) return { ok: false, http: r.status, detalhe: "Chave da Resend recusada." };
  const d = await r.json() as { data?: { name: string; status: string }[] };
  const dominios = (d.data ?? []).map((x) => `${x.name} (${x.status})`);
  return { ok: true, detalhe: `Chave válida. Domínios: ${dominios.join(", ") || "nenhum"}`, remetente };
}

/* Valida o acesso do token ao pixel SEM registrar conversão.
   Um Purchase de teste sem `test_event_code` entra no relatório como venda
   real e estraga a métrica do lançamento — por isso o padrão aqui é só
   consultar. Passando `testEventCode` (Gerenciador > Eventos > Testar
   eventos), aí sim mandamos um Purchase que não conta no relatório. */
async function testarMeta(testEventCode?: string) {
  /* Testa CADA par pixel/token. Com dois pixels, um token vencido passaria
     despercebido se olhássemos só o primeiro. */
  const pares = await paresConfigurados();
  const idsBrutos = (process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!idsBrutos.length) return { ok: false, detalhe: "NEXT_PUBLIC_META_PIXEL_ID não está no build." };
  if (!pares.length) return { ok: false, detalhe: "META_CAPI_TOKEN não configurado (ou sem token para nenhum pixel)." };

  const semToken = idsBrutos.filter((id) => !pares.some((p) => p.id === id));
  const resultados = await Promise.all(pares.map((par) => testarUmPixel(par, testEventCode)));
  const falhas = resultados.filter((r) => !r.ok);

  return {
    ok: falhas.length === 0 && semToken.length === 0,
    detalhe: [
      `${resultados.length - falhas.length}/${resultados.length} pixel(s) com token válido.`,
      semToken.length ? `Sem token: ${semToken.join(", ")}.` : "",
    ].filter(Boolean).join(" "),
    pixels: resultados,
    ...(semToken.length ? { semToken } : {}),
  };
}

async function testarUmPixel({ id: pixelId, token }: { id: string; token: string }, testEventCode?: string) {

  if (!testEventCode) {
    /* Testa o que interessa — o envio — sem registrar conversão: manda uma
       lista de eventos VAZIA. A Meta valida o token primeiro; se ele não
       servisse, viria OAuthException. Com token bom, o erro é sobre o
       conteúdo, o que prova que o envio está autorizado.

       Ler /{pixel-id} não serve de teste: exige permissão de leitura de
       ativo, que um token de envio de eventos legitimamente não tem. */
    const sonda = await fetch(`https://graph.facebook.com/v21.0/${pixelId}/events`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: token, data: [] }),
    });
    const texto = await sonda.text();
    /* Cuidado: a Meta usa `OAuthException` como TIPO para quase todo erro,
       inclusive validação de corpo. Classificar por ele dá falso negativo —
       "param data must be non-empty" viraria "token sem permissão". A
       distinção está na MENSAGEM. */
    let mensagem = "";
    try { mensagem = (JSON.parse(texto) as { error?: { message?: string } }).error?.message ?? ""; }
    catch { mensagem = texto; }
    const auth = /invalid oauth|error validating|missing permission|access token|expired|não autorizado|unauthorized/i
      .test(mensagem) && !/param .* (must|is required)/i.test(mensagem);

    if (sonda.ok) {
      return { pixel: pixelId, ok: true, detalhe: "Token autorizado a enviar eventos." };
    }
    if (auth) {
      return { pixel: pixelId, ok: false, http: sonda.status, detalhe: `Sem permissão: ${mensagem.slice(0, 140)}` };
    }
    return {
      pixel: pixelId, ok: true,
      detalhe: "Token autorizado (a Meta recusou só o corpo vazio da sonda, não a credencial).",
      resposta: mensagem.slice(0, 140),
    };
  }

  const r = await fetch(`https://graph.facebook.com/v21.0/${pixelId}/events`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: token,
      test_event_code: testEventCode,
      data: [{
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: `teste-${Date.now()}`,
        action_source: "website",
        user_data: {},
        custom_data: { currency: "BRL", value: 1.0, order_id: "TESTE" },
      }],
    }),
  });
  const resp = await r.text();
  return r.ok
    ? { pixel: pixelId, ok: true, detalhe: "Purchase de teste enviado. Veja em Gerenciador > Eventos > Testar eventos.", resposta: resp.slice(0, 160) }
    : { pixel: pixelId, ok: false, http: r.status, detalhe: "A Meta recusou o evento.", resposta: resp.slice(0, 200) };
}

const TESTES: Record<string, () => Promise<unknown>> = {
  correios: testarCorreios,
  pinpay: testarPinpay,
  resend: testarResend,
};

export async function POST(req: Request) {
  if (!(await autenticado())) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }
  const corpo = await req.json().catch(() => null);
  const servico = String(corpo?.servico ?? "");
  if (servico === "meta") {
    const codigo = typeof corpo?.testEventCode === "string" ? corpo.testEventCode : undefined;
    return NextResponse.json({ servico, ...(await testarMeta(codigo)) as object });
  }
  const teste = TESTES[servico];
  if (!teste) {
    return NextResponse.json({ erro: `Serviço desconhecido. Use: ${Object.keys(TESTES).join(", ")}, meta` }, { status: 400 });
  }
  return NextResponse.json({ servico, ...(await teste()) as object });
}
