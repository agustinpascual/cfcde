/** Contrato documentado em https://axxonpay.readme.io/reference/createdirectpayment. */
export type PagamentoAxxon = {
  id: string;
  amount: number;
  status: string;
  paymentMethod?: string;
  method?: string;
  qrCode?: string | null;
  expiresAt?: string | null;
  confirmedAt?: string | null;
  metadata?: { external_reference?: string } | null;
  nextAction?: { type: string; provider?: string; payload: Record<string, unknown> } | null;
};

export const idAxxon = (id: string) => `axxon_${id}`;
export const ehAxxon = (id: string) => id.startsWith("axxon_");
export const idRemotoAxxon = (id: string) => {
  const remoto = id.slice(6);
  if (!ehAxxon(id) || !/^[a-zA-Z0-9_-]{4,58}$/.test(remoto)) throw new Error("ID AxxonPay inválido");
  return remoto;
};

export function statusAxxon(status: string): string {
  const estados: Record<string, string> = {
    PAID: "approved", FINISHED: "approved", SUCCEEDED: "approved", APPROVED: "approved",
    FAILED: "failed", REFUSED: "failed", CANCELLED: "failed", CANCELED: "failed",
    EXPIRED: "expired", REFUNDED: "refunded",
  };
  // requires_action/processing e status desconhecido NUNCA são aprovação.
  return estados[status.toUpperCase()] ?? "pending";
}

export function lerPagamentoAxxon(valor: unknown): PagamentoAxxon {
  const envelope = valor as { data?: unknown } | null;
  const p = (envelope?.data ?? valor) as PagamentoAxxon | null;
  if (!p || typeof p.id !== "string" || !/^[a-zA-Z0-9_-]{4,58}$/.test(p.id)
      || !Number.isSafeInteger(p.amount) || p.amount <= 0 || typeof p.status !== "string") {
    throw new Error("Resposta de pagamento AxxonPay inválida");
  }
  return p;
}

export function conferirPagamentoAxxon(p: PagamentoAxxon, pedido: {
  pix_id: string | null; referencia: string; valor_centavos: number; metodo_pagamento: string;
}) {
  if ((pedido.pix_id && pedido.pix_id !== idAxxon(p.id)) || p.amount !== pedido.valor_centavos
      || (p.metadata?.external_reference && p.metadata.external_reference !== pedido.referencia)
      || (p.paymentMethod ?? p.method) !== (pedido.metodo_pagamento === "cartao" ? "credit_card" : "pix")) {
    throw new Error("A transação não corresponde ao pedido");
  }
}
