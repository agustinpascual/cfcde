import { NextResponse } from "next/server";
import { autenticado } from "@/lib/painel-auth";
import { supabaseAdmin } from "@/lib/supabase/servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const texto = (v: unknown, max = 8000) => String(v ?? "").slice(0, max);

export async function POST(req: Request) {
  if (!(await autenticado())) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ erro: "Supabase não configurado." }, { status: 503 });

  const c = await req.json().catch(() => null);
  if (!c) return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });

  const exemplos = Array.isArray(c.exemplos)
    ? c.exemplos
        .filter((e: unknown) => e && typeof e === "object")
        .slice(0, 30)
        .map((e: { pergunta?: unknown; resposta?: unknown }) => ({
          pergunta: texto(e.pergunta, 500),
          resposta: texto(e.resposta, 1500),
        }))
        .filter((e: { pergunta: string; resposta: string }) => e.pergunta && e.resposta)
    : [];

  const { error } = await db.from("treinamento").update({
    ativo: Boolean(c.ativo),
    tom: texto(c.tom, 1000),
    sobre_produto: texto(c.sobre_produto),
    regras: texto(c.regras),
    nao_pode: texto(c.nao_pode),
    escalar_quando: texto(c.escalar_quando, 2000),
    escalar_mensagem: texto(c.escalar_mensagem, 600),
    exemplos,
    atualizado_em: new Date().toISOString(),
  }).eq("id", 1);

  if (error) {
    console.error("[treinamento]", error.message);
    return NextResponse.json({ erro: error.message }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
