import { NextResponse } from "next/server";
import { excedeu, ipDe } from "@/lib/limite";
import { supabaseAdmin } from "@/lib/supabase/servidor";
import { detectarDispositivo } from "@/lib/dispositivos";
import { ErroCorpo, lerJsonObjeto } from "@/lib/corpo-json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Recebe os pings do rastreador do site. A produção roda na Cloudflare, mas
   o fallback dos headers da Vercel mantém o mesmo código utilizável nos dois
   ambientes. O IP só é gravado quando a migration 0025 está instalada. */

const TIPOS = new Set(["pageview", "secao", "comprar", "checkout", "checkout_parcial", "pix_gerado", "pix_copiado", "voltou", "compra", "saida"]);

/* O cliente já não manda ping do painel, mas a rota é pública: quem chamar
   direto também não polui o mapa nem o funil. */
const PRIVADAS = ["/ioh3j4ciof3n3oic"];
const privada = (caminho: string | null) => Boolean(caminho && PRIVADAS.some((p) => caminho.startsWith(p)));
const txt = (v: unknown, max = 120) => (typeof v === "string" ? v.slice(0, max) : null);

export async function POST(req: Request) {
  // o heartbeat legítimo é a cada 20s; 40/min já cobre várias abas
  if (excedeu(`track:${ipDe(req)}`, 40, 60_000)) {
    return new NextResponse(null, { status: 429 });
  }

  const db = supabaseAdmin();
  // sem service_role o site segue normal; só não registra
  if (!db) return NextResponse.json({ ok: false, motivo: "sem_supabase" }, { status: 202 });

  let corpo: Record<string, unknown>;
  try { corpo = await lerJsonObjeto(req, 8 * 1024); }
  catch (e) {
    if (e instanceof ErroCorpo) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  const sessao = txt(corpo.sessao, 64);
  if (!sessao) return NextResponse.json({ erro: "sessão ausente" }, { status: 400 });

  if (privada(txt(corpo.pagina, 160))) {
    return NextResponse.json({ ok: false, motivo: "pagina_privada" }, { status: 202 });
  }

  const h = req.headers;
  const decodifica = (v: string | null) => { try { return v ? decodeURIComponent(v) : null; } catch { return v; } };
  const lat = Number(h.get("cf-iplatitude") ?? h.get("x-vercel-ip-latitude"));
  const lng = Number(h.get("cf-iplongitude") ?? h.get("x-vercel-ip-longitude"));
  const toques = Number(corpo.toques);
  const plataforma = txt(corpo.plataforma, 50);

  const sessaoLinha = {
    sessao,
    pagina: txt(corpo.pagina, 160),
    secao: txt(corpo.secao, 80),
    cidade: decodifica(h.get("cf-ipcity") ?? h.get("x-vercel-ip-city")),
    uf: h.get("cf-region-code") ?? h.get("x-vercel-ip-country-region"),
    pais: h.get("cf-ipcountry") ?? h.get("cf-country") ?? h.get("x-vercel-ip-country") ?? "BR",
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lng) ? lng : null,
    dispositivo: detectarDispositivo(h.get("user-agent") ?? "", plataforma, Number.isFinite(toques) ? toques : 0),
    ip: (() => { const v = ipDe(req); return v === "desconhecido" ? null : v; })(),
    referencia: txt(corpo.referencia, 200),
    visto_em: new Date().toISOString(),
    ...(corpo.tipo === "pix_copiado" ? { copiou_pix: true } : {}),
    ...(txt(corpo.pedido) ? { pedido_ref: txt(corpo.pedido) } : {}),
  };

  try {
    /* O supabase-js devolve o erro no objeto, não lança. Sem checar,
       a rota respondia ok:true mesmo com a tabela inexistente. */
    let { error: erroSessao } = await db
      .from("sessoes").upsert(sessaoLinha, { onConflict: "sessao" });
    /* Produções antigas podem ainda não ter `sessoes.ip`. O rastreamento
       principal não deve parar por causa desse recurso opcional: repete sem
       o IP, enquanto o painel de instalação aponta exatamente a migration. */
    if (erroSessao && ["42703", "PGRST204"].includes(erroSessao.code) && erroSessao.message.includes("ip")) {
      const semIp = { ...sessaoLinha } as Partial<typeof sessaoLinha>;
      delete semIp.ip;
      ({ error: erroSessao } = await db.from("sessoes").upsert(semIp, { onConflict: "sessao" }));
    }
    if (erroSessao) {
      console.error("[track] sessoes:", erroSessao.message);
      return NextResponse.json({ ok: false, motivo: "sessao_nao_registrada" }, { status: 202 });
    }

    const tipo = txt(corpo.tipo, 20);
    // heartbeat não vira evento — só atualiza visto_em acima
    if (tipo && TIPOS.has(tipo)) {
      const { error: erroEvento } = await db.from("eventos").insert({
        sessao,
        tipo,
        pagina: txt(corpo.pagina, 160),
        dados: (corpo.dados && typeof corpo.dados === "object" ? corpo.dados : {}) as object,
      });
      if (erroEvento) {
        console.error("[track] eventos:", erroEvento.message);
        return NextResponse.json({ ok: false, motivo: "evento_nao_registrado" }, { status: 202 });
      }
    }
  } catch (e) {
    console.error("[track] falha ao gravar:", (e as Error).message);
    return NextResponse.json({ ok: false }, { status: 202 });
  }

  return NextResponse.json({ ok: true, cidade: sessaoLinha.cidade, uf: sessaoLinha.uf });
}
