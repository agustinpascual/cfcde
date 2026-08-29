import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Recebe os pings do rastreador do site.
   A localização vem dos headers que o Vercel injeta a partir do IP — não
   guardamos o IP em si, só cidade/UF e coordenadas aproximadas. */

const TIPOS = new Set(["pageview", "secao", "checkout", "pix_gerado", "pix_copiado", "compra", "saida"]);
const txt = (v: unknown, max = 120) => (typeof v === "string" ? v.slice(0, max) : null);

function dispositivoDe(ua: string) {
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
}

export async function POST(req: Request) {
  const db = supabaseAdmin();
  // sem service_role o site segue normal; só não registra
  if (!db) return NextResponse.json({ ok: false, motivo: "sem_supabase" }, { status: 202 });

  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }

  const sessao = txt(corpo.sessao, 64);
  if (!sessao) return NextResponse.json({ erro: "sessão ausente" }, { status: 400 });

  const h = req.headers;
  const decodifica = (v: string | null) => { try { return v ? decodeURIComponent(v) : null; } catch { return v; } };
  const lat = Number(h.get("x-vercel-ip-latitude"));
  const lng = Number(h.get("x-vercel-ip-longitude"));

  const sessaoLinha = {
    sessao,
    pagina: txt(corpo.pagina, 160),
    secao: txt(corpo.secao, 80),
    cidade: decodifica(h.get("x-vercel-ip-city")),
    uf: h.get("x-vercel-ip-country-region"),
    pais: h.get("x-vercel-ip-country") ?? "BR",
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lng) ? lng : null,
    dispositivo: dispositivoDe(h.get("user-agent") ?? ""),
    referencia: txt(corpo.referencia, 200),
    visto_em: new Date().toISOString(),
    ...(corpo.tipo === "pix_copiado" ? { copiou_pix: true } : {}),
    ...(txt(corpo.pedido) ? { pedido_ref: txt(corpo.pedido) } : {}),
  };

  try {
    await db.from("sessoes").upsert(sessaoLinha, { onConflict: "sessao" });

    const tipo = txt(corpo.tipo, 20);
    // heartbeat não vira evento — só atualiza visto_em acima
    if (tipo && TIPOS.has(tipo)) {
      await db.from("eventos").insert({
        sessao,
        tipo,
        pagina: txt(corpo.pagina, 160),
        dados: (corpo.dados && typeof corpo.dados === "object" ? corpo.dados : {}) as object,
      });
    }
  } catch (e) {
    console.error("[track] falha ao gravar:", (e as Error).message);
    return NextResponse.json({ ok: false }, { status: 202 });
  }

  return NextResponse.json({ ok: true });
}
