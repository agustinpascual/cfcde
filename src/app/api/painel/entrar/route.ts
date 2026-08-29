import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { criarSessao, emailAdmin, NOME_COOKIE } from "@/lib/painel-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Compara em tempo constante — evita descobrir o valor por medição. */
function igual(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export async function POST(req: Request) {
  const senhaEsperada = process.env.PAINEL_SENHA;
  const emailEsperado = emailAdmin();
  if (!senhaEsperada || !emailEsperado) {
    return NextResponse.json(
      { erro: "PAINEL_EMAIL e PAINEL_SENHA precisam estar configurados no servidor." },
      { status: 503 }
    );
  }

  const corpo = await req.json().catch(() => ({}));
  const email = String(corpo.email ?? "").trim().toLowerCase();
  const senha = String(corpo.senha ?? "");

  // avalia as duas antes de responder, para não vazar qual delas errou
  const emailOk = igual(email, emailEsperado);
  const senhaOk = igual(senha, senhaEsperada);
  if (!emailOk || !senhaOk) {
    return NextResponse.json({ erro: "E-mail ou senha incorretos." }, { status: 401 });
  }

  const { valor, maxAge } = criarSessao(emailEsperado);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(NOME_COOKIE, valor, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge,
  });
  return res;
}
