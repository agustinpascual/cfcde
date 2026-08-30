import { NextResponse } from "next/server";
import { autenticado } from "@/lib/painel-auth";
import { supabaseAdmin } from "@/lib/supabase/servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lista de conversas para a coluna da esquerda. */
export async function GET() {
  if (!(await autenticado())) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ conversas: [] });

  const { data, error } = await db
    .from("conversas")
    .select("id,telefone,nome,status,robo_ativo,ultima_msg,ultima_em,nao_lidas")
    .order("ultima_em", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ conversas: data ?? [] });
}
