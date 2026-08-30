import { NextResponse } from "next/server";
import { autenticado } from "@/lib/painel-auth";
import { enviarWhatsApp } from "@/lib/robo";
import { supabaseAdmin } from "@/lib/supabase/servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Histórico completo de uma conversa e marcação de lida. */
export async function GET(_req: Request, { params }: Ctx) {
  if (!(await autenticado())) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  const { id } = await params;

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ mensagens: [] });

  const [conversa, mensagens] = await Promise.all([
    db.from("conversas").select("*").eq("id", id).single(),
    db.from("mensagens").select("id,autor,texto,midia_url,midia_tipo,enviada,erro,criado_em")
      .eq("conversa", id).order("criado_em").limit(500),
  ]);

  if (conversa.error) return NextResponse.json({ erro: "conversa não encontrada" }, { status: 404 });

  // abrir a conversa zera o contador de não lidas
  if ((conversa.data?.nao_lidas ?? 0) > 0) {
    await db.from("conversas").update({ nao_lidas: 0 }).eq("id", id);
  }

  return NextResponse.json({ conversa: conversa.data, mensagens: mensagens.data ?? [] });
}

/** Resposta do atendente. Assumir na mão desliga o robô nessa conversa. */
export async function POST(req: Request, { params }: Ctx) {
  if (!(await autenticado())) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  const { id } = await params;

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ erro: "Supabase não configurado" }, { status: 500 });

  let corpo: { texto?: unknown; robo_ativo?: unknown };
  try { corpo = await req.json(); } catch { return NextResponse.json({ erro: "JSON inválido" }, { status: 400 }); }

  const { data: conversa } = await db.from("conversas").select("telefone").eq("id", id).single();
  if (!conversa) return NextResponse.json({ erro: "conversa não encontrada" }, { status: 404 });

  // alternar o robô sem mandar mensagem
  if (typeof corpo.robo_ativo === "boolean" && corpo.texto === undefined) {
    await db.from("conversas").update({ robo_ativo: corpo.robo_ativo }).eq("id", id);
    return NextResponse.json({ ok: true, robo_ativo: corpo.robo_ativo });
  }

  const texto = typeof corpo.texto === "string" ? corpo.texto.trim().slice(0, 4000) : "";
  if (!texto) return NextResponse.json({ erro: "mensagem vazia" }, { status: 400 });

  /* Grava antes de enviar: se a Z-API falhar, a mensagem fica registrada com
     o erro em vez de sumir da tela do atendente. */
  const { data: linha } = await db.from("mensagens")
    .insert({ conversa: id, autor: "atendente", texto, enviada: false })
    .select("id").single();

  try {
    await enviarWhatsApp(conversa.telefone, texto);
    await db.from("mensagens").update({ enviada: true }).eq("id", linha?.id ?? 0);
  } catch (e) {
    const erro = (e as Error).message.slice(0, 300);
    await db.from("mensagens").update({ erro }).eq("id", linha?.id ?? 0);
    return NextResponse.json({ erro }, { status: 502 });
  }

  await db.from("conversas")
    .update({ ultima_msg: texto, ultima_em: new Date().toISOString(), robo_ativo: false, status: "aberta" })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
