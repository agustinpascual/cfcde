import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { ler } from "@/lib/config-integracoes";
import { consultarPix, type PixStatus } from "@/lib/pinpay";
import { confirmarPorEmail, depois, registrarCompraNoPixel } from "@/lib/confirmar-pedido";
import { entregarAcessoApp } from "@/lib/entrega-app";
import { supabaseAdmin } from "@/lib/supabase/servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* Webhook da PinPay.
   Assinatura: header `x-webhook-signature` no formato "sha256=<hex>",
   HMAC-SHA256 sobre os BYTES CRUS do corpo, com o Signing Secret (whsec_…)
   deste endpoint — cada webhook cadastrado no painel tem o seu.
   Envelope: { event, data }. */

/* Status da API -> evento equivalente. É a tradução que permite tratar um
   aviso confirmado exatamente como um assinado. */
const STATUS_PARA_EVENTO: Record<string, string | undefined> = {
  approved: "payment_approved",
  paid: "payment_approved",
  failed: "payment_failed",
  refused: "payment_failed",
  expired: "payment_expired",
  refunded: "payment_refunded",
};

function assinaturaConfere(bruto: string, recebida: string | null, segredo: string) {
  if (!recebida) return false;
  const esperada = "sha256=" + crypto.createHmac("sha256", segredo).update(bruto, "utf8").digest("hex");
  const a = Buffer.from(esperada);
  const b = Buffer.from(recebida);
  // timingSafeEqual exige o mesmo tamanho
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  /* Duas formas de confiar no aviso, nesta ordem:

     1. Assinatura HMAC, se a conta tiver Signing Secret. É a mais forte.
     2. Sem secret: o aviso vira só um GATILHO. Nada é aplicado por causa do
        que ele diz — perguntamos o status à PinPay com o token da loja, que
        ninguém de fora tem. Um aviso forjado de "pagamento aprovado" não
        marca nada, porque a consulta devolve o status real.

     Recusar o webhook por falta de secret (o que este código fazia) era pior:
     nenhum pagamento era confirmado. */
  const segredo = await ler("PINPAY_WEBHOOK_SECRET");

  // req.text() preserva os bytes exatos — necessário para o HMAC bater
  const bruto = await req.text();

  let confiavel = false;
  if (segredo) {
    if (!assinaturaConfere(bruto, req.headers.get("x-webhook-signature"), segredo)) {
      console.warn("[pinpay] assinatura inválida — descartado");
      return new NextResponse(null, { status: 401 });
    }
    confiavel = true;
  }

  let envelope: { event?: string; data?: Record<string, unknown> };
  try {
    envelope = JSON.parse(bruto);
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }

  const { event, data } = envelope;
  const referencia = (data?.external_reference ?? data?.transaction_id ?? data?.id) as string | undefined;
  const idTransacao = (data?.transaction_id ?? data?.id) as string | undefined;

  /* Sem assinatura, o conteúdo do aviso não vale nada por si só: perguntamos
     à PinPay qual é o status de verdade e agimos por ele. Um aviso forjado
     dizendo "aprovado" cai aqui e vira o status real (pendente), sem efeito. */
  let evento = event;
  let pixConfirmado: PixStatus | undefined;
  // O UUID do webhook pode diferir do código PIX devolvido na criação.
  // A consulta resolve esse UUID para o ID e a referência salvos no pedido.
  if (idTransacao || !confiavel) {
    if (!idTransacao) {
      console.warn("[pinpay] aviso sem id de transação — ignorado");
      return NextResponse.json({ ok: true, ignorado: "sem_id" });
    }
    try {
      const pix = await consultarPix(idTransacao, AbortSignal.timeout(8000));
      pixConfirmado = pix;
      const real = STATUS_PARA_EVENTO[String(pix.status)];
      if (event !== real) {
        console.info(`[pinpay] aviso dizia "${event}", a API diz "${pix.status}" — vale a API`);
      }
      evento = real;
      if (!evento) return NextResponse.json({ ok: true, ignorado: pix.status });
    } catch (e) {
      /* Não deu para confirmar: responder 5xx faz a PinPay reenviar depois,
         que é melhor que aplicar um status que não confirmamos. */
      /* Detalhar a causa aqui não expõe segredo e economiza um ciclo de
         deploy quando algo quebra em produção. */
      const causa = (e as Error).message.slice(0, 200);
      console.error("[pinpay] falha ao confirmar na API:", causa);
      return NextResponse.json({ erro: "nao_confirmado", causa }, { status: 503 });
    }
  }

  const db = supabaseAdmin();
  const pixId = pixConfirmado?.id ?? idTransacao;
  const ref = pixConfirmado?.external_reference ?? pixConfirmado?.metadata?.external_reference ??
    (confiavel ? data?.external_reference as string | undefined : undefined);

  /* Idempotente: a PinPay reenvia o mesmo evento, e marcar como pago duas
     vezes tem que dar no mesmo. */
  async function marcar(status: string, pago = false) {
    if (!db) throw new Error("Supabase não configurado");
    const alvo = db.from("pedidos").update({
      status,
      ...(pago ? { pago_em: pixConfirmado?.paid_at ?? pixConfirmado?.updated_at ?? new Date().toISOString() } : {}),
    });
    const filtro = pixId ? alvo.eq("pix_id", pixId)
                 : ref ? alvo.eq("referencia", ref) : null;
    if (!filtro) throw new Error("evento sem identificador");
    const { data: pedido, error } = await filtro.eq("metodo_pagamento", "pix")
      .select("referencia").maybeSingle();
    if (error) throw new Error(error.message);
    if (!pedido) throw new Error("pedido não encontrado");
    return pedido.referencia as string;
  }

  // guarda o evento cru, para auditoria
  let eventoGravado: number | string | undefined;
  if (db) {
    const { data: registro, error } = await db.from("eventos_webhook").insert({
      provedor: "pinpay", evento: event ?? "desconhecido",
      pix_id: idTransacao ?? pixId ?? null, payload: envelope, processado: false,
    }).select("id").single();
    if (error) console.error("[pinpay] falha ao registrar webhook:", error.message);
    eventoGravado = registro?.id;
  }

  switch (evento) {
    case "payment_approved": {
      // A transação do gateway pode chegar sem external_reference.
      const referenciaPedido = await marcar("aprovado", true);
      console.info("[pinpay] pagamento aprovado:", referencia);
      /* O e-mail de confirmação NÃO pode segurar a resposta: a PinPay
         reenvia o webhook se demorarmos, e gerar PDF + falar com a Resend
         leva segundos. Vai em segundo plano com waitUntil, que mantém o
         Worker vivo depois do return. */
      // O e-mail começa sem esperar a resposta do pixel ou a entrega do app.
      depois(confirmarPorEmail(referenciaPedido).then((r) => {
        if (!r.ok) console.error("[pinpay] e-mail de confirmação falhou:", r.motivo);
      }));
      depois(registrarCompraNoPixel(referenciaPedido));
      depois(entregarAcessoApp(referenciaPedido).then((r) => {
        if (!r.ok) console.error("[pinpay] entrega do app falhou:", r.motivo);
      }));
      break;
    }
    case "payment_failed":
      await marcar("falhou");
      console.info("[pinpay] pagamento falhou:", referencia);
      break;
    case "payment_expired":
      await marcar("expirado");
      console.info("[pinpay] cobrança expirada:", referencia);
      break;
    case "payment_refunded":
      await marcar("estornado");
      console.info("[pinpay] estorno:", referencia);
      break;
    default:
      console.info("[pinpay] evento ignorado:", event, referencia);
  }

  if (db && eventoGravado !== undefined) {
    const { error } = await db.from("eventos_webhook").update({ processado: true }).eq("id", eventoGravado);
    if (error) console.error("[pinpay] falha ao concluir auditoria:", error.message);
  }

  // responder 2xx rápido evita reenvio
  return NextResponse.json({ ok: true });
}
