import { NextResponse } from "next/server";
import { autenticado } from "@/lib/painel-auth";
import { supabaseAdmin } from "@/lib/supabase/servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Grava o código de rastreio de um pedido. Só para quem está logado —
   sem isso qualquer um alteraria o rastreio de qualquer venda. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await autenticado())) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ erro: "Supabase não configurado." }, { status: 503 });

  const { id } = await params;
  const corpo = await req.json().catch(() => null);
  const bruto = typeof corpo?.codigo === "string" ? corpo.codigo : "";
  /* Correios usam maiúsculas e sem espaço; normalizar aqui evita que o
     mesmo código gravado de dois jeitos pareça diferente. */
  const codigo = bruto.trim().toUpperCase().replace(/\s+/g, "");

  if (codigo.length > 60) {
    return NextResponse.json({ erro: "Código longo demais." }, { status: 400 });
  }

  const { error } = await db.from("pedidos").update({
    codigo_rastreio: codigo || null,
    rastreio_atualizado: codigo ? new Date().toISOString() : null,
  }).eq("id", id);

  if (error) {
    console.error("[rastreio] falha ao gravar:", error.message);
    /* 42703 = coluna não existe: a migration 0021 ainda não foi aplicada.
       Dizer isso é mais útil que um "erro interno" genérico. */
    const faltaColuna = (error as { code?: string }).code === "42703";
    return NextResponse.json(
      { erro: faltaColuna ? "A coluna codigo_rastreio não existe — rode a migration 0021 no Supabase." : error.message },
      { status: faltaColuna ? 501 : 503 }
    );
  }

  return NextResponse.json({ ok: true, codigo: codigo || null });
}
