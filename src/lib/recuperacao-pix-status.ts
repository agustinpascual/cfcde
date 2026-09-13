import "server-only";
import { consultarPagamentoAxxon } from "./axxonpay";
import { conferirPagamentoAxxon, ehAxxon, idRemotoAxxon } from "./axxonpay-protocolo";
import { consultarPix } from "./pinpay";

/** Consulta somente leitura: uma falha ou um estado incerto impede o lembrete. */
export async function pixAindaPendente(pedido: {
  pix_id: string | null; referencia: string; valor_centavos: number;
}) {
  if (!pedido.pix_id) return false;
  const sinal = AbortSignal.timeout(8000);
  if (ehAxxon(pedido.pix_id)) {
    const pagamento = await consultarPagamentoAxxon(idRemotoAxxon(pedido.pix_id), sinal);
    conferirPagamentoAxxon(pagamento, { ...pedido, metodo_pagamento: "pix" });
    return pagamento.status.toUpperCase() === "PENDING"
      && (!pagamento.expiresAt || Date.parse(pagamento.expiresAt) > Date.now());
  }
  const pagamento = await consultarPix(pedido.pix_id, sinal);
  if (pagamento.id !== pedido.pix_id || pagamento.amount !== pedido.valor_centavos
      || (pagamento.external_reference && pagamento.external_reference !== pedido.referencia)) {
    throw new Error("A transação não corresponde ao pedido");
  }
  return pagamento.status === "pending";
}
