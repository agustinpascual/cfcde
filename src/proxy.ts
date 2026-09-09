import { NextResponse, type NextRequest } from "next/server";

/* Blacklist de IP. Recusa o acesso ao site vindo de IPs na tabela
   `ips_bloqueados`. Regras que mantêm isto seguro para um site em produção:

   - O painel (/painel, /api/painel) NUNCA é bloqueado — assim o lojista não se
     tranca fora do admin nem que bloqueie o próprio IP por engano.
   - A lista é lida da tabela com cache de 60s em memória do isolate, então não
     é uma consulta por requisição.
   - Falha-aberto: se a leitura der erro, ninguém é bloqueado — um problema no
     banco jamais derruba a loja. */

let cache: { ips: Set<string>; expira: number } | null = null;

async function ipsBloqueados(): Promise<Set<string>> {
  if (cache && cache.expira > Date.now()) return cache.ips;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return cache?.ips ?? new Set();
  try {
    const r = await fetch(`${url}/rest/v1/ips_bloqueados?select=ip`, {
      headers: { apikey: chave, Authorization: `Bearer ${chave}` },
    });
    if (!r.ok) return cache?.ips ?? new Set();
    const linhas = (await r.json()) as { ip: string }[];
    const ips = new Set(Array.isArray(linhas) ? linhas.map((l) => l.ip) : []);
    cache = { ips, expira: Date.now() + 60_000 };
    return ips;
  } catch {
    return cache?.ips ?? new Set();   // falha-aberto
  }
}

export async function proxy(req: NextRequest) {
  try {
    const caminho = req.nextUrl.pathname;
    // o admin e o webhook da PinPay ficam sempre acessíveis
    if (caminho.startsWith("/painel") || caminho.startsWith("/api/painel") || caminho.startsWith("/api/webhooks")) {
      return NextResponse.next();
    }

    const ip = req.headers.get("cf-connecting-ip")
      || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip");
    if (!ip) return NextResponse.next();

    if ((await ipsBloqueados()).has(ip)) {
      return new NextResponse("Acesso indisponível.", {
        status: 403,
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
      });
    }
    return NextResponse.next();
  } catch {
    // qualquer falha no proxy jamais pode derrubar a loja
    return NextResponse.next();
  }
}

/* Roda em tudo, menos assets estáticos e imagens otimizadas — não faz sentido
   checar IP em cada .css/.js/.webp, e mantém o overhead baixo. */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
