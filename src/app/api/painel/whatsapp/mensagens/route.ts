import { NextResponse } from "next/server";
import { salvar } from "@/lib/config-integracoes";
import { validarMensagemRecuperacao, VARIAVEIS_CARRINHO, VARIAVEIS_PIX } from "@/lib/mensagens-recuperacao";
import { autenticado } from "@/lib/painel-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await autenticado())) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  if (req.headers.get("origin") !== new URL(req.url).origin) {
    return NextResponse.json({ erro: "Origem inválida." }, { status: 403 });
  }

  const corpo = await req.json().catch(() => null);
  const pix = validarMensagemRecuperacao(corpo?.pix, VARIAVEIS_PIX);
  if (!pix.ok) return NextResponse.json({ erro: `Pix pendente: ${pix.erro}` }, { status: 400 });
  const carrinho = validarMensagemRecuperacao(corpo?.carrinho, VARIAVEIS_CARRINHO);
  if (!carrinho.ok) return NextResponse.json({ erro: `Carrinho abandonado: ${carrinho.erro}` }, { status: 400 });

  try {
    await Promise.all([
      salvar("WHATSAPP_MSG_PIX_PENDENTE", pix.mensagem, "painel"),
      salvar("WHATSAPP_MSG_CARRINHO_ABANDONADO", carrinho.mensagem, "painel"),
    ]);
    return NextResponse.json({ ok: true });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Não foi possível salvar as mensagens.";
    console.error("[whatsapp/mensagens] falha ao salvar:", mensagem);
    return NextResponse.json({ erro: mensagem }, { status: 503 });
  }
}
