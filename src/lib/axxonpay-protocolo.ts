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
  metadata?: { external_reference?: string; payment_attempt?: string } | null;
  nextAction?: { type: string; provider?: string; payload: Record<string, unknown> } | null;
};

export type CriacaoAxxon = Pick<PagamentoAxxon, "id" | "nextAction">;

/** A criação fornece o ID; valor/status serão conferidos por GET canônico. */
export function lerCriacaoAxxon(valor: unknown): CriacaoAxxon {
  const envelope = valor as { data?: unknown } | null;
  const p = (envelope?.data ?? valor) as CriacaoAxxon | null;
  if (!p || typeof p.id !== "string" || !/^[a-zA-Z0-9_-]{4,58}$/.test(p.id)) {
    throw new Error("Resposta de criação AxxonPay sem ID válido");
  }
  return { id: p.id, nextAction: p.nextAction ?? null };
}

/** GET /payments/:id retorna BRL em reais, observado na API real.
 * A entrada de POST /direct/payment continua em centavos. Nunca decide a
 * unidade comparando com o total esperado nem arredonda uma divergência.
 */
export function lerConsultaPagamentoAxxon(valor: unknown): PagamentoAxxon {
  const envelope = valor as { data?: unknown } | null;
  const p = (envelope?.data ?? valor) as (PagamentoAxxon & { currency?: string }) | null;
  if (!p || p.currency !== "BRL" || typeof p.amount !== "number" || !Number.isFinite(p.amount)) {
    throw new Error("Valor ou moeda inválidos na consulta AxxonPay");
  }
  const partes = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(p.amount));
  if (!partes) throw new Error("Precisão monetária inválida na consulta AxxonPay");
  const amount = Number(partes[1]) * 100 + Number((partes[2] ?? "").padEnd(2, "0"));
  return lerPagamentoAxxon({ ...p, amount });
}

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
  let metadata: unknown = p.metadata;
  if (typeof metadata === "string") {
    try { metadata = JSON.parse(metadata); }
    catch { throw new Error("Referência AxxonPay inválida"); }
  }
  const referencia = (metadata as { external_reference?: unknown } | null)?.external_reference;
  const tentativa = (metadata as { payment_attempt?: unknown } | null)?.payment_attempt;
  if (referencia !== undefined && typeof referencia !== "string") throw new Error("Referência AxxonPay inválida");
  if (tentativa !== undefined && typeof tentativa !== "string") throw new Error("Tentativa AxxonPay inválida");
  // Não propaga dados pessoais adicionados pelo gateway dentro de metadata.
  return { ...p, ...(metadata != null ? { metadata: {
    ...(typeof referencia === "string" ? { external_reference: referencia } : {}),
    ...(typeof tentativa === "string" ? { payment_attempt: tentativa } : {}),
  } } : {}) };
}

export function conferirPagamentoAxxon(p: PagamentoAxxon, pedido: {
  pix_id: string | null; referencia: string; valor_centavos: number; metodo_pagamento: string;
}) {
  // A criação usa paymentMethod "credit_card"; o GET /payments/:id real
  // (09/09/2026) devolve method "card". Ambos identificam cartão de crédito.
  const metodo = String(p.paymentMethod ?? p.method ?? "").toLowerCase();
  const cartao = metodo === "credit_card" || metodo === "card";
  const metodoConfere = pedido.metodo_pagamento === "cartao" ? cartao : metodo === "pix";
  if ((pedido.pix_id && pedido.pix_id !== idAxxon(p.id)) || p.amount !== pedido.valor_centavos
      || (p.metadata?.external_reference && p.metadata.external_reference !== pedido.referencia) || !metodoConfere) {
    throw new Error("A transação não corresponde ao pedido");
  }
}
