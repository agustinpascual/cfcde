import { NextResponse } from "next/server";
import { salvar } from "@/lib/config-integracoes";
import { validarMensagemRecuperacao, VARIAVEIS_CARRINHO, VARIAVEIS_PIX } from "@/lib/mensagens-recuperacao";
import { autenticado } from "@/lib/painel-auth";
import { mesmaOrigem } from "@/lib/mesma-origem";
import { validarAtrasoRecuperacao } from "@/lib/recuperacao-whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await autenticado())) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  if (!mesmaOrigem(req)) {
    return NextResponse.json({ erro: "Origem inválida." }, { status: 403 });
  }

  const corpo = await req.json().catch(() => null);
  const pix = validarMensagemRecuperacao(corpo?.pix, VARIAVEIS_PIX);
  if (!pix.ok) return NextResponse.json({ erro: `Pix pendente: ${pix.erro}` }, { status: 400 });
  const carrinho = validarMensagemRecuperacao(corpo?.carrinho, VARIAVEIS_CARRINHO);
  if (!carrinho.ok) return NextResponse.json({ erro: `Carrinho abandonado: ${carrinho.erro}` }, { status: 400 });
  const atrasoPix = validarAtrasoRecuperacao(corpo?.atrasoPix);
  const atrasoCarrinho = validarAtrasoRecuperacao(corpo?.atrasoCarrinho);
  if (atrasoPix === null || atrasoCarrinho === null) {
    return NextResponse.json({ erro: "Escolha um tempo válido para as recuperações." }, { status: 400 });
  }
  if (typeof corpo?.botaoPix !== "boolean") {
    return NextResponse.json({ erro: "Escolha se a recuperação Pix deve exibir o botão de copiar." }, { status: 400 });
  }

  try {
    await Promise.all([
      salvar("WHATSAPP_MSG_PIX_PENDENTE", pix.mensagem, "painel"),
      salvar("WHATSAPP_MSG_CARRINHO_ABANDONADO", carrinho.mensagem, "painel"),
      salvar("WHATSAPP_RECUPERACAO_PIX_MINUTOS", String(atrasoPix), "painel"),
      salvar("WHATSAPP_RECUPERACAO_CARRINHO_MINUTOS", String(atrasoCarrinho), "painel"),
      salvar("WHATSAPP_PIX_BOTAO_COPIAR", corpo.botaoPix ? "1" : "0", "painel"),
    ]);
    return NextResponse.json({ ok: true });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Não foi possível salvar as mensagens.";
    console.error("[whatsapp/mensagens] falha ao salvar:", mensagem);
    return NextResponse.json({ erro: mensagem }, { status: 503 });
  }
}
