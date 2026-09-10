import { NextResponse } from "next/server";
import { processarRecuperacoesWhatsApp } from "@/lib/recuperacao-whatsapp";
import { reconciliarPendentes } from "@/lib/reconciliar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  /* Na VPS o agendador roda dentro do próprio container. Instalações antigas
     já têm PAINEL_SENHA, então ela funciona como fallback até um segredo
     exclusivo ser definido, sem deixar a rota pública. */
  const segredo = process.env.CRON_SECRET || process.env.PAINEL_SENHA;
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
