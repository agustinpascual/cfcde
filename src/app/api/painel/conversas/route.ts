import { NextResponse } from "next/server";
import { autenticado } from "@/lib/painel-auth";
import { supabaseAdmin } from "@/lib/supabase/servidor";
import { normalizarNomeAtendente } from "@/lib/whatsapp-manual";

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

/** Nome exibido no início de toda resposta enviada manualmente. */
export async function POST(req: Request) {
  if (!(await autenticado())) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ erro: "Supabase não configurado" }, { status: 503 });

  const corpo = await req.json().catch(() => null);
  const nome = normalizarNomeAtendente(corpo?.atendente_nome);
  if (nome.length < 2) return NextResponse.json({ erro: "Informe um nome válido" }, { status: 400 });

  const { error } = await db.from("treinamento").update({
    atendente_nome: nome,
    atualizado_em: new Date().toISOString(),
  }).eq("id", 1);

  if (error) return NextResponse.json({ erro: error.message }, { status: 503 });
  return NextResponse.json({ ok: true, atendente_nome: nome });
}
