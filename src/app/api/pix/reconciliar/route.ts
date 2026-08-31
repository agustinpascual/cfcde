import { NextResponse } from "next/server";
import { autenticado } from "@/lib/painel-auth";
import { reconciliarPendentes } from "@/lib/reconciliar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* Aceita duas formas de autorização:
   - sessão do painel (botão "Conferir pagamentos")
   - header x-cron-secret == CRON_SECRET (para agendar na Vercel)
   Sem uma das duas, 401. */
async function autorizado(req: Request): Promise<boolean> {
  if (await autenticado()) return true;
  const segredo = process.env.CRON_SECRET;
  return Boolean(segredo && req.headers.get("x-cron-secret") === segredo);
}

export async function POST(req: Request) {
  if (!(await autorizado(req))) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  const r = await reconciliarPendentes();
  return NextResponse.json({ ok: true, ...r });
}

// GET com o mesmo secret facilita o agendamento por cron
export async function GET(req: Request) {
  return POST(req);
}
