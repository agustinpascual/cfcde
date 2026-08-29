import "server-only";

/* Cliente PinPay — roda SÓ no servidor.
   Doc: https://hub.usepinpay.com/documentacao
   A chave sk_ nunca pode ir para o browser: por isso este módulo importa
   "server-only" e a variável NÃO tem prefixo NEXT_PUBLIC_. */

const BASE = "https://api.usepinpay.com/functions/v1/api-v1";

export type PixCriado = {
  id: string;
  amount: number;
  status: "pending" | "approved" | "expired" | string;
  payment_method: string;
  pix: { qr_code: string; qr_code_url: string; expires_at: string };
  external_reference: string;
  created_at: string;
};

export type PixStatus = {
  id: string;
  status: "pending" | "approved" | "expired" | string;
  amount: number;
  paid_at?: string;
  customer?: { name: string; document: string };
};

function token() {
  const t = process.env.PINPAY_TOKEN;
  if (!t) throw new Error("PINPAY_TOKEN não configurado — defina em .env.local");
  return t;
}

async function chamar<T>(caminho: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${caminho}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const texto = await res.text();
  let corpo: unknown = null;
  try { corpo = texto ? JSON.parse(texto) : null; } catch { /* resposta não-JSON */ }

  if (!res.ok) {
    const msg = (corpo as { message?: string; error?: string } | null);
    throw Object.assign(
      new Error(msg?.message || msg?.error || `PinPay respondeu ${res.status}`),
      { status: res.status, corpo }
    );
  }
  return corpo as T;
}

/* Confere se a credencial está válida (GET /balance da doc). */
export const verificarCredencial = () => chamar<unknown>("/balance", { method: "GET" });

export function criarPix(dados: {
  amount: number;               // centavos, mínimo 100
  description?: string;
  customer: { name: string; email: string; document: { number: string } };
  metadata: { external_reference: string; checkout_url: string };
}) {
  return chamar<PixCriado>("/pix", { method: "POST", body: JSON.stringify(dados) });
}

export const consultarPix = (id: string) =>
  chamar<PixStatus>(`/pix/${encodeURIComponent(id)}`, { method: "GET" });
