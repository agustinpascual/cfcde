import { NextResponse } from "next/server";
import { NOME_COOKIE } from "@/lib/painel-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Limpa a sessão do painel. Serve também para destravar um cookie antigo
   que ficou inválido depois de trocar PAINEL_EMAIL ou PAINEL_SENHA. */
export async function GET(req: Request) {
  const res = NextResponse.redirect(new URL("/painel/entrar", req.url));
  res.cookies.set(NOME_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
