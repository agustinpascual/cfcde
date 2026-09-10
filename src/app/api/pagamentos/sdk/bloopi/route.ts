import { NextResponse } from "next/server";

const ORIGENS = [
  "https://js.bloopi.io/bloopi.js",
  "https://app.bloopi.io/bloopi.js",
];

let cache: { codigo: string; atualizadoEm: number } | null = null;
const UMA_HORA = 60 * 60 * 1000;

async function baixar() {
  let ultimoErro: unknown;
  for (const origem of ORIGENS) {
    try {
      const resposta = await fetch(origem, {
        cache: "no-store",
        headers: { Accept: "application/javascript" },
        signal: AbortSignal.timeout(8000),
      });
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
      const codigo = await resposta.text();
      if (codigo.length < 1000 || !codigo.includes("Bloopi")) throw new Error("SDK inválido");
      cache = { codigo, atualizadoEm: Date.now() };
      return codigo;
    } catch (erro) {
      ultimoErro = erro;
    }
  }
  if (cache?.codigo) return cache.codigo;
  throw ultimoErro ?? new Error("SDK indisponível");
}

export async function GET() {
  try {
    const codigo = cache && Date.now() - cache.atualizadoEm < UMA_HORA
      ? cache.codigo
      : await baixar();
    return new NextResponse(codigo, {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("/* ambiente seguro temporariamente indisponível */", {
      status: 503,
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
}
