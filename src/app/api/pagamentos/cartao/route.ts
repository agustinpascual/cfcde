import { origemOficial } from "@/lib/origem";
import { excedeu, ipDe } from "@/lib/limite";
import { lerGateways } from "@/lib/gateways-config";
import { processarAxxon } from "@/lib/pagamentos-axxon";

export async function POST(req: Request) {
  if (!origemOficial(req)) return new Response(null, { status: 403 });
  if (excedeu(`cartao:${ipDe(req)}`, 8, 60000)) return Response.json({ erro: "Aguarde um minuto antes de tentar novamente." }, { status: 429 });
  try {
    if ((await lerGateways()).cartao !== "axxonpay") return Response.json({ erro: "Cartão indisponível." }, { status: 503 });
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) return new Response(null, { status: 400 });
    return processarAxxon(body, "cartao");
  } catch { return Response.json({ erro: "Pagamento temporariamente indisponível." }, { status: 503 }); }
}
