import { NextResponse } from "next/server";
import { ler } from "@/lib/config-integracoes";
import { autenticado } from "@/lib/painel-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function base() {
  const [instancia, token, clientToken] = await Promise.all([
    ler("ZAPI_INSTANCIA"), ler("ZAPI_TOKEN"), ler("ZAPI_CLIENT_TOKEN"),
  ]);
  if (!instancia || !token) return null;
  return {
    url: `https://api.z-api.io/instances/${instancia}/token/${token}`,
    headers: (clientToken ? { "Client-Token": clientToken } : {}) as Record<string, string>,
  };
}

/* Status da conexão + QR quando o número cai.
   A instância desconecta sozinha (celular sem bateria, WhatsApp reinstalado,
   sessão expirada) e nada avisa: as mensagens simplesmente param de chegar. */
export async function GET() {
  if (!(await autenticado())) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });

  const z = await base();
  if (!z) return NextResponse.json({ configurada: false });

  try {
    const r = await fetch(`${z.url}/status`, { headers: z.headers, cache: "no-store" });
    const s = await r.json();
    const conectado = Boolean(s.connected && s.smartphoneConnected);

    let qr: string | null = null;
    if (!conectado) {
      const q = await fetch(`${z.url}/qr-code/image`, { headers: z.headers, cache: "no-store" });
      if (q.ok) qr = (await q.json())?.value ?? null;
    }

    return NextResponse.json({
      configurada: true,
      conectado,
      celular: Boolean(s.smartphoneConnected),
      erro: s.error ?? null,
      qr,
    });
  } catch (e) {
    return NextResponse.json({ configurada: true, conectado: false, erro: (e as Error).message });
  }
}

/** Reinicia a sessão — resolve boa parte das quedas sem precisar de QR. */
export async function POST() {
  if (!(await autenticado())) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });

  const z = await base();
  if (!z) return NextResponse.json({ erro: "Z-API não configurada" }, { status: 400 });

  const r = await fetch(`${z.url}/restart`, { headers: z.headers });
  return NextResponse.json({ ok: r.ok });
}
