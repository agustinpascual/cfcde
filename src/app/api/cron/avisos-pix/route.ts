import { NextResponse } from "next/server";
import { processarAvisosPix } from "@/lib/aviso-pix";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  try {
    return NextResponse.json({ ok: true, ...(await processarAvisosPix()) });
  } catch (e) {
    console.error("[aviso-pix] falha:", (e as Error).message);
    return NextResponse.json({ erro: "Falha ao processar avisos." }, { status: 500 });
  }
}
