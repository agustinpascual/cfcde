import { NextResponse } from "next/server";
import { autenticado } from "@/lib/painel-auth";
import { lerTreinamento } from "@/lib/robo";
import { supabaseAdmin } from "@/lib/supabase/servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Perguntas reais que o robô não soube responder, das mais frequentes. */
export async function GET() {
  if (!(await autenticado())) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ duvidas: [] });

  const { data, error } = await db.from("aprendizado")
    .select("id,pergunta,vezes,intencao,confianca,ultima_em")
    .eq("resolvido", false)
    .order("vezes", { ascending: false })
    .order("ultima_em", { ascending: false })
    .limit(40);

  if (error) {
    const codigo = (error as { code?: string }).code;
    return NextResponse.json({
      duvidas: [],
      erro: codigo === "PGRST205"
        ? "A tabela de aprendizado ainda não existe. Rode o SQL em Instalação."
        : error.message,
    });
  }
  return NextResponse.json({ duvidas: data ?? [] });
}

/** Vira exemplo de treinamento, ou é descartada. */
export async function POST(req: Request) {
  if (!(await autenticado())) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ erro: "Supabase não configurado" }, { status: 500 });

  let c: { id?: string; acao?: string; pergunta?: string; resposta?: string };
  try { c = await req.json(); } catch { return NextResponse.json({ erro: "JSON inválido" }, { status: 400 }); }

  if (c.acao === "descartar") {
    await db.from("aprendizado").update({ resolvido: true }).eq("id", c.id ?? "");
    return NextResponse.json({ ok: true });
  }

  const pergunta = String(c.pergunta ?? "").trim();
  const resposta = String(c.resposta ?? "").trim();
  if (!pergunta || !resposta) {
    return NextResponse.json({ erro: "pergunta e resposta são obrigatórias" }, { status: 400 });
  }

  /* Anexa ao treinamento em vez de substituir: o painel e esta tela escrevem
     na mesma lista, e sobrescrever perderia o que foi escrito à mão. */
  const t = await lerTreinamento();
  const exemplos = [...t.exemplos.filter((e) => e.pergunta !== pergunta), { pergunta, resposta }];

  const { error } = await db.from("treinamento")
    .update({ exemplos, atualizado_em: new Date().toISOString() }).eq("id", 1);
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  await db.from("aprendizado").update({ resolvido: true }).eq("id", c.id ?? "");
  return NextResponse.json({ ok: true, total: exemplos.length });
}
