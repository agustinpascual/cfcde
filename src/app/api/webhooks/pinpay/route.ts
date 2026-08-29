import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/servidor";

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

  const db = supabaseAdmin();
  const pixId = (data?.transaction_id ?? data?.id) as string | undefined;
  const ref = data?.external_reference as string | undefined;

  /* Idempotente: a PinPay reenvia o mesmo evento, e marcar como pago duas
     vezes tem que dar no mesmo. */
  async function marcar(status: string, pago = false) {
    if (!db) return;
    const alvo = db.from("pedidos").update({
      status,
      ...(pago ? { pago_em: new Date().toISOString() } : {}),
    });
    const { error } = pixId ? await alvo.eq("pix_id", pixId)
                 : ref     ? await alvo.eq("referencia", ref)
                           : { error: new Error("evento sem identificador") };
    if (error) console.error("[pinpay] falha ao atualizar pedido:", error.message);
  }

  // guarda o evento cru, para auditoria
  if (db) {
    await db.from("eventos_webhook").insert({
      provedor: "pinpay", evento: event ?? "desconhecido",
      pix_id: pixId ?? null, payload: envelope, processado: true,
    });
  }

  switch (event) {
    case "payment_approved":
      await marcar("aprovado", true);
      console.info("[pinpay] pagamento aprovado:", referencia);
      break;
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

  // responder 2xx rápido evita reenvio
  return NextResponse.json({ ok: true });
}
