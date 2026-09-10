import { NextResponse, type NextRequest } from "next/server";
import {
  COOKIE_RECUPERACAO_CARRINHO,
  DURACAO_COOKIE_RECUPERACAO,
  verificarTokenRecuperacaoCarrinho,
} from "@/lib/carrinho-recuperacao";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const valido = Boolean(verificarTokenRecuperacaoCarrinho(token));
  const destino = new URL(valido ? "/checkout?origem=recuperacao" : "/checkout", request.url);
  const resposta = NextResponse.redirect(destino, 303);

  resposta.headers.set("Cache-Control", "no-store, max-age=0");
  resposta.headers.set("Referrer-Policy", "no-referrer");
  resposta.cookies.set(COOKIE_RECUPERACAO_CARRINHO, valido ? token : "", {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/checkout",
    maxAge: valido ? DURACAO_COOKIE_RECUPERACAO : 0,
  });
  return resposta;
}
