import { NextResponse } from "next/server";
import { autenticado } from "@/lib/painel-auth";
import { supabaseAdmin } from "@/lib/supabase/servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ehIp = (v: string) =>
  /^(\d{1,3}\.){3}\d{1,3}$/.test(v) || /^[0-9a-fA-F:]{3,45}$/.test(v);   // IPv4 ou IPv6

/** Bloqueia um IP (recusa o acesso ao site vindo dele). */
export async function POST(req: Request) {
  if (!(await autenticado())) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ erro: "Supabase não configurado" }, { status: 500 });

  let corpo: { ip?: string; motivo?: string };
  try { corpo = await req.json(); } catch { return NextResponse.json({ erro: "JSON inválido" }, { status: 400 }); }
  const ip = String(corpo.ip ?? "").trim();
  if (!ehIp(ip)) return NextResponse.json({ erro: "IP inválido" }, { status: 400 });

  const { error } = await db.from("ips_bloqueados")
    .upsert({ ip, motivo: (corpo.motivo ?? "").slice(0, 200) || null }, { onConflict: "ip" });
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, ip });
}

/** Desbloqueia um IP. */
export async function DELETE(req: Request) {
  if (!(await autenticado())) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ erro: "Supabase não configurado" }, { status: 500 });

  const ip = new URL(req.url).searchParams.get("ip")?.trim() ?? "";
  if (!ehIp(ip)) return NextResponse.json({ erro: "IP inválido" }, { status: 400 });

  const { error } = await db.from("ips_bloqueados").delete().eq("ip", ip);
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, ip });
}
