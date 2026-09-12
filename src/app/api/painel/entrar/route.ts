import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { excedeu, ipDe } from "@/lib/limite";
import { criarSessao, emailAdmin, NOME_COOKIE, painelConfigurado } from "@/lib/painel-auth";
import { mesmaOrigem } from "@/lib/mesma-origem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const responder = (corpo: object, status = 200, headers?: HeadersInit) =>
  NextResponse.json(corpo, { status, headers: { "Cache-Control": "no-store", ...headers } });

/* Compara hashes de tamanho fixo em tempo constante. */
function igual(a: string, b: string) {
  const x = crypto.createHash("sha256").update(a).digest();
  const y = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(x, y);
}

export async function POST(req: Request) {
  if (!mesmaOrigem(req)) return responder({ erro: "Origem inválida." }, 403);

  // trava força bruta na senha do painel
  if (excedeu(`login:${ipDe(req)}`, 5, 300_000)) {
    return responder(
      { erro: "Muitas tentativas. Aguarde 5 minutos." },
      429,
      { "Retry-After": "300" },
    );
  }

  const senhaEsperada = process.env.PAINEL_SENHA;
  const emailEsperado = emailAdmin();
  if (!senhaEsperada || !emailEsperado || !painelConfigurado()) {
    return responder({ erro: "Painel indisponível." }, 503);
  }

  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return responder({ erro: "Conteúdo inválido." }, 415);
  }
  const tamanhoDeclarado = Number(req.headers.get("content-length"));
  if (Number.isFinite(tamanhoDeclarado) && tamanhoDeclarado > 4096) {
    return responder({ erro: "Requisição muito grande." }, 413);
  }
  const bruto = await req.text().catch(() => "");
  if (!bruto || bruto.length > 4096) return responder({ erro: "Requisição inválida." }, 400);
  let corpo: Record<string, unknown>;
  try { corpo = JSON.parse(bruto) as Record<string, unknown>; }
  catch { return responder({ erro: "JSON inválido." }, 400); }
  const email = String(corpo.email ?? "").trim().toLowerCase();
  /* Tira espaço/quebra de linha das pontas: colar a senha de um chat ou
     e-mail costuma trazer um invisível junto, e o erro fica indistinguível
     de senha errada. O e-mail já era normalizado; a senha não era. */
  const senha = String(corpo.senha ?? "").trim();
  if (email.length > 254 || senha.length > 512) {
    return responder({ erro: "E-mail ou senha incorretos." }, 401);
  }

  // avalia as duas antes de responder, para não vazar qual delas errou
  const emailOk = igual(email, emailEsperado);
  const senhaOk = igual(senha, senhaEsperada);
  if (!emailOk || !senhaOk) {
    return responder({ erro: "E-mail ou senha incorretos." }, 401);
  }

  const { valor, maxAge } = criarSessao(emailEsperado);
  const res = responder({ ok: true });
  res.cookies.set(NOME_COOKIE, valor, {
    httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production",
    priority: "high", path: "/", maxAge,
  });
  return res;
}
