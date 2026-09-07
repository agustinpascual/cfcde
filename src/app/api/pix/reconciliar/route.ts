import { NextResponse } from "next/server";
import { autenticado } from "@/lib/painel-auth";
import { reconciliarPendentes } from "@/lib/reconciliar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* Aceita duas formas de autorização:
   - sessão do painel (botão "Conferir pagamentos")
   - segredo do agendador em x-cron-secret ou Authorization: Bearer
   Sem uma das duas, 401. */
async function autorizado(req: Request): Promise<boolean> {
  const segredo = process.env.CRON_SECRET;
  if (segredo && (req.headers.get("x-cron-secret") === segredo ||
      req.headers.get("authorization") === `Bearer ${segredo}`)) return true;
  return autenticado();
}

export async function POST(req: Request) {
  if (!(await autorizado(req))) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  try {
    const r = await reconciliarPendentes();
    return NextResponse.json({ ok: true, ...r }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[reconciliar] falha:", (e as Error).message);
    return NextResponse.json({ erro: "Não foi possível conferir os pagamentos." }, { status: 503 });
  }
}

// GET com o mesmo secret facilita o agendamento por cron
export async function GET(req: Request) {
  return POST(req);
}
