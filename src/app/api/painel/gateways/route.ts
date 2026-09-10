import { autenticado } from "@/lib/painel-auth";
import { configGatewaysValida } from "@/lib/gateways-config";
import { salvar } from "@/lib/config-integracoes";
import { validarAxxon, configuracaoAdquirenteAxxon } from "@/lib/axxonpay";
import { verificarCredencial } from "@/lib/pinpay";
import { mesmaOrigem } from "@/lib/mesma-origem";

export async function POST(req: Request) {
  if (!(await autenticado())) return Response.json({ erro: "Não autenticado." }, { status: 401 });
  if (!mesmaOrigem(req)) return Response.json({ erro: "Origem inválida." }, { status: 403 });
  const config: unknown = await req.json().catch(() => null);
  if (!configGatewaysValida(config)) return Response.json({ erro: "Seleção inválida." }, { status: 400 });
  try {
    if (config.pix === "axxonpay" || config.cartao === "axxonpay") await validarAxxon();
    // Cartão só é salvo se a adquirente vinculada à Public Key for homologada
    // aqui; caso contrário o checkout ficaria anunciando um cartão que falha.
    if (config.cartao === "axxonpay") await configuracaoAdquirenteAxxon();
    if (config.pix === "pinpay") await verificarCredencial();
    await salvar("PAGAMENTOS_GATEWAYS", JSON.stringify({ pix: config.pix, cartao: config.cartao }), "painel");
    return Response.json({ ok: true });
  } catch (erro) {
    return Response.json({ erro: (erro as Error).message }, { status: 503 });
  }
}
