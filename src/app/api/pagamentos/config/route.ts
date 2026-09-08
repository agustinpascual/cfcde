import { lerGateways } from "@/lib/gateways-config";
import { configuracaoAdquirenteAxxon } from "@/lib/axxonpay";

export async function GET() {
  try {
    const config = await lerGateways();
    const cartao = config.cartao === "axxonpay" ? await configuracaoAdquirenteAxxon() : null;
    return Response.json({ pix: config.pix, cartao: config.cartao, publicKey: cartao?.publica ?? null }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ erro: "Não foi possível carregar os meios de pagamento." }, { status: 503 }); }
}
