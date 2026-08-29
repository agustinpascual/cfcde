import crypto from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Webhook da PinPay.
   Assinatura: header `x-webhook-signature` no formato "sha256=<hex>",
   HMAC-SHA256 sobre os BYTES CRUS do corpo, com o Signing Secret (whsec_…)
   deste endpoint — cada webhook cadastrado no painel tem o seu.
   Envelope: { event, data }. */

function assinaturaConfere(bruto: string, recebida: string | null, segredo: string) {
  if (!recebida) return false;
  const esperada = "sha256=" + crypto.createHmac("sha256", segredo).update(bruto, "utf8").digest("hex");
  const a = Buffer.from(esperada);
  const b = Buffer.from(recebida);
  // timingSafeEqual exige o mesmo tamanho
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const segredo = process.env.PINPAY_WEBHOOK_SECRET;
  if (!segredo) {
    console.error("[pinpay] PINPAY_WEBHOOK_SECRET não configurado");
    return new NextResponse(null, { status: 503 });
  }

  // req.text() preserva os bytes exatos — necessário para o HMAC bater
  const bruto = await req.text();
  if (!assinaturaConfere(bruto, req.headers.get("x-webhook-signature"), segredo)) {
    console.warn("[pinpay] webhook com assinatura inválida — descartado");
    return new NextResponse(null, { status: 401 });
  }

  let envelope: { event?: string; data?: Record<string, unknown> };
  try {
    envelope = JSON.parse(bruto);
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }

  const { event, data } = envelope;
  const referencia = (data?.external_reference ?? data?.transaction_id ?? data?.id) as string | undefined;

  switch (event) {
    case "payment_approved":
      // TODO: marcar o pedido como pago no seu banco e disparar a confirmação.
      // Precisa ser idempotente: a PinPay pode reenviar o mesmo evento.
      console.info("[pinpay] pagamento aprovado:", referencia);
      break;
    case "payment_failed":
    case "payment_expired":
      console.info(`[pinpay] ${event}:`, referencia);
      break;
    default:
      console.info("[pinpay] evento ignorado:", event, referencia);
  }

  // responder 2xx rápido evita reenvio
  return NextResponse.json({ ok: true });
}
