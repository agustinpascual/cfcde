import "server-only";
import { ler } from "./config-integracoes";

export type ConfigGateways = { pix: "pinpay" | "axxonpay"; cartao: "desativado" | "sandbox" | "axxonpay" };
export const PADRAO_GATEWAYS: ConfigGateways = { pix: "pinpay", cartao: "desativado" };
export function configGatewaysValida(valor: unknown): valor is ConfigGateways {
  const c = valor as ConfigGateways | null;
  return !!c && ["pinpay", "axxonpay"].includes(c.pix) && ["desativado", "sandbox", "axxonpay"].includes(c.cartao);
}
export async function lerGateways(): Promise<ConfigGateways> {
  const valor = await ler("PAGAMENTOS_GATEWAYS");
  if (!valor) return PADRAO_GATEWAYS;
  const config: unknown = JSON.parse(valor);
  // Configuração inválida não pode direcionar dinheiro silenciosamente.
  if (!configGatewaysValida(config)) throw new Error("Configuração de pagamentos inválida.");
  return config;
}
