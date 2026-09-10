import { NextResponse } from "next/server";
import { salvar } from "@/lib/config-integracoes";
import { validarTagsGoogle } from "@/lib/marketing-config";
import { autenticado } from "@/lib/painel-auth";
import { mesmaOrigem } from "@/lib/mesma-origem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await autenticado())) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  if (!mesmaOrigem(req)) {
    return NextResponse.json({ erro: "Origem inválida." }, { status: 403 });
  }

  const corpo = await req.json().catch(() => null);
  const validacao = validarTagsGoogle(corpo?.tags);
  if (!validacao.ok) return NextResponse.json({ erro: validacao.erro }, { status: 400 });

  try {
    /* [] precisa ser persistido para não reativar a tag única legada. */
    await salvar("GOOGLE_TAGS", JSON.stringify(validacao.tags), "painel");
    return NextResponse.json({ ok: true });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Não foi possível salvar as tags.";
    console.error("[integracoes/google] falha ao salvar:", mensagem);
    return NextResponse.json({ erro: mensagem }, { status: 503 });
  }
}
