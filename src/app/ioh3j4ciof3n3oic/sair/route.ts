import { NextResponse } from "next/server";
import { NOME_COOKIE } from "@/lib/painel-auth";
import { mesmaOrigem } from "@/lib/mesma-origem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Limpa a sessão do painel. Serve também para destravar um cookie antigo
   que ficou inválido depois de trocar PAINEL_EMAIL ou PAINEL_SENHA. */
export async function POST(req: Request) {
  if (!mesmaOrigem(req)) return new NextResponse(null, { status: 403 });
  const res = NextResponse.redirect(new URL("/ioh3j4ciof3n3oic/entrar", req.url));
  res.headers.set("Cache-Control", "no-store");
  res.cookies.set(NOME_COOKIE, "", {
    httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production",
    priority: "high", path: "/", maxAge: 0,
  });
  return res;
}
