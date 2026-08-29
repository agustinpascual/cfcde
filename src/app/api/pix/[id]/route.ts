import { NextResponse } from "next/server";
import { consultarPix } from "@/lib/pinpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Consulta de status usada pelo polling do checkout.
   Devolve só o status — sem dados do pagador. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[A-Za-z0-9_-]{4,64}$/.test(id)) {
    return NextResponse.json({ erro: "ID inválido" }, { status: 400 });
  }
  try {
    const pix = await consultarPix(id);
    return NextResponse.json({ id: pix.id, status: pix.status, paid_at: pix.paid_at ?? null });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 404) return NextResponse.json({ erro: "Cobrança não encontrada" }, { status: 404 });
    console.error("[pinpay] falha ao consultar PIX:", err.message);
    return NextResponse.json({ erro: "Falha ao consultar o pagamento." }, { status: 502 });
  }
}
