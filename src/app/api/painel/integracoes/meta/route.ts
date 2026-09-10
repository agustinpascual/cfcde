import { NextResponse } from "next/server";
import { salvar } from "@/lib/config-integracoes";
import { lerPixelsMeta, validarPixelsMeta } from "@/lib/marketing-config";
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
  const validacao = validarPixelsMeta(corpo?.pixels);
  if (!validacao.ok) return NextResponse.json({ erro: validacao.erro }, { status: 400 });

  const atuais = new Map((await lerPixelsMeta()).map((pixel) => [pixel.id, pixel.token]));
  const pixels = validacao.pixels.map((pixel) => ({
    id: pixel.id,
    token: pixel.token || atuais.get(pixel.id) || "",
  }));
  const semToken = pixels.find((pixel) => !pixel.token);
  if (semToken) {
    return NextResponse.json({ erro: `Informe o token da API de Conversões do pixel ${semToken.id}.` }, { status: 400 });
  }

  try {
    /* [] é uma configuração explícita. Apagar a chave reativaria os pixels
       legados do ambiente e faria pixels removidos reaparecerem. */
    await salvar("META_PIXELS", JSON.stringify(pixels), "painel");
    return NextResponse.json({ ok: true });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Não foi possível salvar os pixels.";
    console.error("[integracoes/meta] falha ao salvar:", mensagem);
    return NextResponse.json({ erro: mensagem }, { status: 503 });
  }
}
