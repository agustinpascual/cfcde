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

export type CriacaoAxxon = Pick<PagamentoAxxon, "id" | "nextAction"> &
  Partial<Pick<PagamentoAxxon, "amount" | "status" | "paymentMethod" | "qrCode" | "expiresAt">>;

/**
 * A criação sempre fornece o ID. Os demais campos são opcionais porque
 * versões antigas da resposta não os traziam; quando presentes, conservamos
 * somente tipos estritos para permitir o caminho rápido do PIX.
 */
export function lerCriacaoAxxon(valor: unknown): CriacaoAxxon {
  const envelope = valor as { data?: unknown } | null;
  const p = (envelope?.data ?? valor) as Partial<PagamentoAxxon> | null;
  if (!p || typeof p.id !== "string" || !/^[a-zA-Z0-9_-]{4,58}$/.test(p.id)) {
    throw new Error("Resposta de criação AxxonPay sem ID válido");
  }
  const criado: CriacaoAxxon = { id: p.id, nextAction: p.nextAction ?? null };
  if (typeof p.amount === "number" && Number.isSafeInteger(p.amount) && p.amount > 0) criado.amount = p.amount;
  if (typeof p.status === "string" && p.status.length <= 64) criado.status = p.status;
  if (typeof p.paymentMethod === "string" && p.paymentMethod.length <= 64) criado.paymentMethod = p.paymentMethod;
  if (p.qrCode === null || (typeof p.qrCode === "string" && p.qrCode.length <= 4096)) criado.qrCode = p.qrCode;
  if (p.expiresAt === null || (typeof p.expiresAt === "string" && p.expiresAt.length <= 100)) criado.expiresAt = p.expiresAt;
  return criado;
}

/**
 * O POST autenticado pode devolver o PIX completo. Só dispensamos o GET
 * imediato quando todos os campos que ligam o QR ao pedido batem de forma
 * inequívoca. Qualquer resposta antiga, ambígua ou divergente cai no fluxo de
 * consulta canônica; este atalho jamais transforma a criação em aprovação.
 */
export function pixPendenteDaCriacaoAxxon(criado: CriacaoAxxon, totalCentavos: number): PagamentoAxxon | null {
  if (!Number.isSafeInteger(totalCentavos) || totalCentavos <= 0
      || criado.amount !== totalCentavos
      || criado.paymentMethod?.toLowerCase() !== "pix"
      || criado.status?.toUpperCase() !== "PENDING"
      || typeof criado.qrCode !== "string"
      || !criado.qrCode.trim()
      || criado.qrCode.length > 4096) {
    return null;
  }
  return {
    id: criado.id,
    amount: criado.amount,
    status: criado.status,
    paymentMethod: "pix",
    qrCode: criado.qrCode,
    expiresAt: criado.expiresAt ?? null,
  };
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
