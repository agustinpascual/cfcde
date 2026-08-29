import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { excedeu, ipDe } from "@/lib/limite";
import { criarSessao, emailAdmin, NOME_COOKIE } from "@/lib/painel-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Compara em tempo constante — evita descobrir o valor por medição. */
function igual(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export async function POST(req: Request) {
  // trava força bruta na senha do painel
  if (excedeu(`login:${ipDe(req)}`, 5, 300_000)) {
    return NextResponse.json(
      { erro: "Muitas tentativas. Aguarde 5 minutos." },
      { status: 429, headers: { "Retry-After": "300" } }
    );
  }

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
  /* Tira espaço/quebra de linha das pontas: colar a senha de um chat ou
     e-mail costuma trazer um invisível junto, e o erro fica indistinguível
     de senha errada. O e-mail já era normalizado; a senha não era. */
  const senha = String(corpo.senha ?? "").trim();

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
