import { NextResponse } from "next/server";
import { autenticado } from "@/lib/painel-auth";
import { supabaseAdmin } from "@/lib/supabase/servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Diagnóstico do rastreamento: mostra o que o servidor realmente enxerga
   do visitante e se o banco está respondendo. Protegido por login. */
export async function GET(req: Request) {
  if (!(await autenticado())) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const h = req.headers;
  const dec = (v: string | null) => { try { return v ? decodeURIComponent(v) : null; } catch { return v; } };

  const geo = {
    cidade: dec(h.get("x-vercel-ip-city")),
    uf: h.get("x-vercel-ip-country-region"),
    pais: h.get("x-vercel-ip-country"),
    latitude: h.get("x-vercel-ip-latitude"),
    longitude: h.get("x-vercel-ip-longitude"),
    fuso: h.get("x-vercel-ip-timezone"),
  };

  const tabelas: Record<string, string> = {};
  const db = supabaseAdmin();
  if (db) {
    /* Um select de verdade, não head:true — com head o supabase-js devolve
       204 e error null mesmo quando a tabela NÃO existe, o que fazia este
       diagnóstico reportar "ok" para tabela inexistente. */
    for (const t of ["pedidos", "sessoes", "eventos", "eventos_webhook", "configuracoes", "conversas", "mensagens", "treinamento"]) {
      const { error, count } = await db.from(t).select("*", { count: "exact" }).limit(1);
      tabelas[t] = error
        ? (/schema cache|does not exist/i.test(error.message) ? "NÃO EXISTE — rode supabase/TUDO.sql" : `ERRO: ${error.message}`)
        : `ok (${count ?? 0} linhas)`;
    }
  }

  const faltando = Object.entries(tabelas).filter(([, v]) => !v.startsWith("ok")).map(([k]) => k);

  return NextResponse.json({
    pronto: faltando.length === 0,
    tabelasFaltando: faltando,
    geolocalizacao: geo,
    geoDisponivel: Boolean(geo.latitude && geo.longitude),
    // o IP em si não é guardado — só cidade/UF e a coordenada aproximada
    ipVisto: Boolean(h.get("x-forwarded-for")),
    supabaseConfigurado: Boolean(db),
    chaveMestraConfigurada: Boolean(process.env.CHAVE_MESTRA && process.env.CHAVE_MESTRA.length >= 32),
    anthropicConfigurada: Boolean(process.env.ANTHROPIC_API_KEY),
    tabelas,
  });
}
