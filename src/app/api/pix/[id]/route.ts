import { NextResponse } from "next/server";
import { consultarPix } from "@/lib/pinpay";
import { supabaseAdmin } from "@/lib/supabase/servidor";
import { confirmarPorEmail, depois, registrarCompraNoPixel } from "@/lib/confirmar-pedido";
import { entregarAcessoApp } from "@/lib/entrega-app";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* Consulta usada pela página de pagamento (render + polling).
   Devolve status e os dados do QR — nunca dados do pagador.
   O id é um UUID não adivinhável; ainda assim, nada de PII sai daqui. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[A-Za-z0-9_-]{4,64}$/.test(id)) {
    return NextResponse.json({ erro: "ID inválido" }, { status: 400 });
  }
  try {
    /* Quando já pagou, a página de pagamento vira tela de agradecimento e
       precisa do rastreio. Só o código sai daqui — nenhum dado do comprador.
       O id é um UUID não adivinhável, então isso não vaza pedido de ninguém. */
    let rastreio: string | null = null;
    let referencia: string | null = null;
    let pedido: {
      referencia: string; codigo_rastreio: string | null; status: string;
      pago_em: string | null; valor_centavos: number;
    } | null = null;
    const db = supabaseAdmin();
    if (db) {
      const { data, error } = await db.from("pedidos")
        .select("referencia,codigo_rastreio,status,pago_em,valor_centavos")
        .eq("pix_id", id).eq("metodo_pagamento", "pix").maybeSingle();
      if (error) console.error("[pix] falha ao ler confirmação:", error.message);
      pedido = data;
      referencia = pedido?.referencia ?? null;
      rastreio = pedido?.codigo_rastreio ?? null;
    }

    // Se o webhook já confirmou, não aguarda uma segunda chamada ao gateway.
    if (pedido?.status === "aprovado" || pedido?.status === "estornado") {
      return NextResponse.json({
        id, status: pedido.status === "aprovado" ? "approved" : "refunded",
        paid_at: pedido.pago_em, amount: pedido.valor_centavos,
        pedido: referencia, codigo_rastreio: rastreio,
      }, { headers: { "Cache-Control": "no-store" } });
    }

    const pix = await consultarPix(id, AbortSignal.timeout(8000));
    if (pedido && (pix.amount !== pedido.valor_centavos ||
        (pix.external_reference && pix.external_reference !== pedido.referencia))) {
      throw new Error("Dados da transação divergem do pedido");
    }
    // A consulta é a alternativa quando o webhook demora ou não chega.
    // Só a transição gravada por esta requisição dispara as integrações.
    if (db && referencia && (pix.status === "approved" || pix.status === "paid")) {
      const { data: atualizado, error } = await db.from("pedidos").update({
        status: "aprovado", pago_em: pix.paid_at ?? pix.updated_at ?? new Date().toISOString(),
      }).eq("pix_id", id).eq("metodo_pagamento", "pix")
        .in("status", ["pendente", "expirado", "falhou"])
        .select("referencia").maybeSingle();
      if (error) console.error("[pix] falha ao salvar aprovação:", error.message);
      if (atualizado) {
        depois(confirmarPorEmail(atualizado.referencia).then((r) => {
          if (!r.ok) console.error("[pix] confirmação por e-mail falhou:", r.motivo);
        }));
        depois(registrarCompraNoPixel(atualizado.referencia));
        depois(entregarAcessoApp(atualizado.referencia).then((r) => {
          if (!r.ok) console.error("[pix] entrega do app falhou:", r.motivo);
        }));
      }
    }

    return NextResponse.json({
      id: pix.id,
      status: pix.status,
      paid_at: pix.paid_at ?? null,
      amount: pix.amount ?? null,
      pedido: referencia,
      codigo_rastreio: rastreio,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 404) return NextResponse.json({ erro: "Cobrança não encontrada" }, { status: 404 });
    console.error("[pinpay] falha ao consultar PIX:", err.message);
    return NextResponse.json({ erro: "Falha ao consultar o pagamento." }, { status: 502 });
  }
}
