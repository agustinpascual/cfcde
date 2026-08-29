"use client";

/* Ponte entre o checkout e a página de pagamento.
   A cobrança criada fica no sessionStorage só para a página abrir sem um
   segundo request. Se não houver (reload, link colado), a página busca em
   /api/pix/{id}. Nada sensível é guardado — só QR, valor e nº do pedido. */
export type Cobranca = {
  id: string;
  pedido: string;
  total: number;
  qr_code: string;
  qr_code_url: string | null;
  expires_at: string;
};

const chave = (id: string) => `bb:cobranca:${id}`;

export function guardarCobranca(c: Cobranca) {
  try {
    sessionStorage.setItem(chave(c.id), JSON.stringify(c));
  } catch { /* storage bloqueado — a página busca na API */ }
}

export function lerCobranca(id: string): Cobranca | null {
  try {
    const bruto = sessionStorage.getItem(chave(id));
    return bruto ? (JSON.parse(bruto) as Cobranca) : null;
  } catch {
    return null;
  }
}
