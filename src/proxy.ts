import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { mesmaOrigem } from "@/lib/mesma-origem";
import { NOME_COOKIE, painelConfigurado, sessaoValida } from "@/lib/painel-auth";

/* Blacklist de IP. Recusa o acesso ao site vindo de IPs na tabela
   `ips_bloqueados`. Regras que mantêm isto seguro para um site em produção:

   - O painel (/ioh3j4ciof3n3oic, /api/painel) NUNCA é bloqueado — assim o lojista não se
     tranca fora do admin nem que bloqueie o próprio IP por engano.
   - A lista é lida da tabela com cache de 60s em memória do isolate, então não
     é uma consulta por requisição.
   - Falha-aberto: se a leitura der erro, ninguém é bloqueado — um problema no
     banco jamais derruba a loja. */

const DURACAO_CACHE_IPS = 5 * 60_000;
let cache: { ips: Set<string>; expira: number } | null = null;
let atualizacao: Promise<Set<string>> | null = null;

function atualizarIpsBloqueados(): Promise<Set<string>> {
  if (cache && cache.expira > Date.now()) return Promise.resolve(cache.ips);
  if (atualizacao) return atualizacao;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return Promise.resolve(cache?.ips ?? new Set());

  atualizacao = (async () => {
    try {
      const r = await fetch(`${url}/rest/v1/ips_bloqueados?select=ip`, {
        headers: { apikey: chave, Authorization: `Bearer ${chave}` },
      });
      if (!r.ok) return cache?.ips ?? new Set();
      const linhas = (await r.json()) as { ip: string }[];
      const ips = new Set(Array.isArray(linhas) ? linhas.map((l) => l.ip) : []);
      cache = { ips, expira: Date.now() + DURACAO_CACHE_IPS };
      return ips;
    } catch {
      return cache?.ips ?? new Set();   // falha-aberto
    } finally {
      atualizacao = null;
    }
  })();
  return atualizacao;
}

export async function proxy(req: NextRequest, evento: NextFetchEvent) {
  try {
    const caminho = req.nextUrl.pathname;
    const paginaPainel = caminho === "/ioh3j4ciof3n3oic" || caminho.startsWith("/ioh3j4ciof3n3oic/");
    const apiPainel = caminho === "/api/painel" || caminho.startsWith("/api/painel/");
    const login = caminho === "/ioh3j4ciof3n3oic/entrar" || caminho === "/api/painel/entrar";
    const metodoSeguro = req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS";

    /* Barreira central contra CSRF. Cada Route Handler continua validando a
       sessão perto dos dados; este bloco protege também qualquer rota nova
       que alguém esqueça de endurecer no futuro. */
    if ((apiPainel || paginaPainel) && !metodoSeguro && !mesmaOrigem(req)) {
      return NextResponse.json({ erro: "Origem inválida." }, {
        status: 403,
        headers: { "Cache-Control": "no-store" },
      });
    }

    /* Checagem otimista no perímetro. Não substitui a autorização das APIs e
       páginas; apenas impede que pedidos anônimos cheguem até elas. */
    if ((apiPainel || paginaPainel) && !login && painelConfigurado()
        && !sessaoValida(req.cookies.get(NOME_COOKIE)?.value)) {
      if (apiPainel) {
        return NextResponse.json({ erro: "Não autenticado." }, {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        });
      }
      const destino = new URL("/ioh3j4ciof3n3oic/entrar", req.url);
      return NextResponse.redirect(destino, 303);
    }

    // painel e webhooks não obedecem à blacklist manual de visitantes
    if (paginaPainel || apiPainel || caminho.startsWith("/api/webhooks")) {
      return NextResponse.next();
    }

    const ip = req.headers.get("cf-connecting-ip")
      || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip");
    if (!ip) return NextResponse.next();

    /* Páginas públicas GET não ficam esperando o Supabase em um reinício da
       VPS. A última blacklist continua valendo e a renovação acontece após a
       resposta. Escritas e APIs sensíveis aguardam a lista atualizada. */
    let ips = cache?.ips ?? new Set<string>();
    if (!cache || cache.expira <= Date.now()) {
      const renovacao = atualizarIpsBloqueados();
      if (metodoSeguro) evento.waitUntil(renovacao.then(() => undefined));
      else ips = await renovacao;
    }

    if (ips.has(ip)) {
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
  matcher: ["/((?!_next/static|_next/image|sites/|marca/|favicon.ico|robots.txt|sitemap.xml).*)"],
};
