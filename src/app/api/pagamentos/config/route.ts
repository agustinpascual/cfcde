import { lerGateways } from "@/lib/gateways-config";
import { configuracaoAdquirenteAxxon } from "@/lib/axxonpay";
import { PARCELAS_MAX } from "@/lib/cartao";

/* O estado do cartão pode mudar no painel a qualquer momento. Não reutilizar
   uma resposta antiga evita exibir cartão ativo como indisponível (ou o
   inverso) durante os minutos seguintes à alteração. */
const headers = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    const config = await lerGateways();
    const base = { pix: config.pix, cartao: config.cartao === "sandbox" ? "sandbox" : "desativado",
      publicKey: null as string | null, cartaoDisponivel: false, parcelas: PARCELAS_MAX };
    if (config.cartao !== "axxonpay") return Response.json(base, { headers });
    try {
      // A chave pública só sai quando a adquirente atual é aceita pelo servidor.
      // Uma seleção antiga com adquirente não homologada não derruba o PIX.
      const { publica } = await configuracaoAdquirenteAxxon();
      return Response.json({ ...base, cartao: "axxonpay", publicKey: publica, cartaoDisponivel: true }, { headers });
    } catch (erro) {
      console.error("[pagamentos/config] AxxonPay indisponível:",
        erro instanceof Error ? erro.message : "erro desconhecido");
      return Response.json(base, { headers });
    }
  } catch { return Response.json({ erro: "Não foi possível carregar os meios de pagamento." }, { status: 503 }); }
}
