import { NextResponse } from "next/server";
import { CHAVES, salvar, type ChaveConfig } from "@/lib/config-integracoes";
import { autenticado } from "@/lib/painel-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Salva credenciais das integrações. Só para quem está logado no painel —
   sem isso qualquer um gravaria a chave de pagamento da loja. */
export async function POST(req: Request) {
  if (!(await autenticado())) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const corpo = await req.json().catch(() => null);
  const chave = corpo?.chave as ChaveConfig | undefined;
  const valor = typeof corpo?.valor === "string" ? corpo.valor : "";

  if (!chave || !CHAVES.includes(chave)) {
    return NextResponse.json({ erro: "Chave desconhecida." }, { status: 400 });
  }
  if (valor.length > 2000) {
    return NextResponse.json({ erro: "Valor longo demais." }, { status: 400 });
  }

  try {
    await salvar(chave, valor, "painel");
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = (e as Error).message;
    console.error("[integracoes] falha ao salvar:", msg);
    return NextResponse.json({ erro: msg }, { status: 503 });
  }
}
