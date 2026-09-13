import { NextResponse } from "next/server";
import { autenticado } from "@/lib/painel-auth";
import { supabaseAdmin } from "@/lib/supabase/servidor";
import { ipDe } from "@/lib/limite";
import { complementarLocalizacao, localizacaoCompleta, localizacaoDosHeaders, localizarIp } from "@/lib/geolocalizacao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Diagnóstico do rastreamento: mostra o que o servidor realmente enxerga
   do visitante e se o banco está respondendo. Protegido por login. */
export async function GET(req: Request) {
  if (!(await autenticado())) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const h = req.headers;
  const ip = ipDe(req);
  const geoHeaders = localizacaoDosHeaders(h);
  const geo = complementarLocalizacao(geoHeaders, localizacaoCompleta(geoHeaders) ? null : await localizarIp(ip));

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
    geolocalizacao: { ...geo, fuso: h.get("cf-timezone") ?? h.get("x-vercel-ip-timezone") },
    geoDisponivel: geo.latitude !== null && geo.longitude !== null,
    geoHeadersDisponiveis: localizacaoCompleta(geoHeaders),
    ipVisto: ip !== "desconhecido",
    supabaseConfigurado: Boolean(db),
    chaveMestraConfigurada: Boolean(process.env.CHAVE_MESTRA && process.env.CHAVE_MESTRA.length >= 32),
    anthropicConfigurada: Boolean(process.env.ANTHROPIC_API_KEY),
    tabelas,
  });
}
