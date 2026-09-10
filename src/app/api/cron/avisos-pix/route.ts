import { NextResponse } from "next/server";
import { processarRecuperacoesWhatsApp } from "@/lib/recuperacao-whatsapp";
import { reconciliarPendentes } from "@/lib/reconciliar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  try {
    /* Primeiro atualiza o estado real no gateway. Assim um Pix pago segundos
       antes do ciclo nunca recebe mensagem de cobrança pendente. */
    const pagamentos = await reconciliarPendentes(30);
    const recuperacoes = await processarRecuperacoesWhatsApp();
    return NextResponse.json({ ok: true, pagamentos, recuperacoes });
  } catch (e) {
    console.error("[recuperacoes] falha:", (e as Error).message);
    return NextResponse.json({ erro: "Falha ao processar recuperações." }, { status: 500 });
  }
}
