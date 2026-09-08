import { consultarPagamentoAxxon } from "@/lib/axxonpay";
import { sincronizarAxxon } from "@/lib/pagamentos-axxon";
import { excedeu, ipDe } from "@/lib/limite";

export async function POST(req: Request) {
  if (excedeu(`axxon-webhook:${ipDe(req)}`, 120, 60000)) return new Response(null, { status: 429 });
  const bruto = await req.text();
  if (bruto.length > 32768) return new Response(null, { status: 413 });
  let id: unknown;
  try { id = JSON.parse(bruto)?.data?.id; } catch { return new Response(null, { status: 400 }); }
  if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{4,58}$/.test(id)) return new Response(null, { status: 400 });
  try {
    // A doc não especifica assinatura. O webhook é SOMENTE um aviso:
    // status, valor, ID, método e referência são conferidos na API oficial.
    await sincronizarAxxon(await consultarPagamentoAxxon(id, AbortSignal.timeout(8000)));
    return Response.json({ received: true });
  } catch { return Response.json({ erro: "Pagamento não confirmado." }, { status: 503 }); }
}
