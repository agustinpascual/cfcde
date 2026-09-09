export const CHAVE_PAGAMENTO = "cdp:pagamento";
const CHAVE_PIX_LEGADA = "cdp:pix";

export type PagamentoNavegacao = {
  id: string;
  pedido: string;
  total: number;
  metodo: "pix" | "cartao";
  confirmado: boolean;
  qr_code: string;
  qr_code_url: string | null;
  expires_at?: string;
  codigo_rastreio?: string | null;
};

type DadosPagamento = Partial<PagamentoNavegacao> & Pick<PagamentoNavegacao, "id" | "pedido" | "total">;

/* Persiste somente o necessário para a tela pós-checkout. O objeto é
   reconstruído campo a campo para que PAN, CVV ou qualquer dado do comprador
   nunca acompanhem o pagamento caso um chamador passe propriedades extras. */
export function salvarPagamentoParaTela(dados: DadosPagamento) {
  const seguro: PagamentoNavegacao = {
    id: String(dados.id),
    pedido: String(dados.pedido),
    total: Math.round(Number(dados.total)),
    metodo: dados.metodo === "cartao" ? "cartao" : "pix",
    confirmado: dados.confirmado === true,
    qr_code: typeof dados.qr_code === "string" ? dados.qr_code : "",
    qr_code_url: typeof dados.qr_code_url === "string" ? dados.qr_code_url : null,
    ...(typeof dados.expires_at === "string" ? { expires_at: dados.expires_at } : {}),
    ...(typeof dados.codigo_rastreio === "string" ? { codigo_rastreio: dados.codigo_rastreio } : {}),
  };
  sessionStorage.setItem(CHAVE_PAGAMENTO, JSON.stringify(seguro));
}

function normalizar(bruto: string, legado = false): PagamentoNavegacao | null {
  try {
    const dados = JSON.parse(bruto) as Partial<PagamentoNavegacao>;
    if (typeof dados.id !== "string" || !dados.id || typeof dados.pedido !== "string" || !dados.pedido
        || !Number.isInteger(dados.total) || Number(dados.total) <= 0) return null;
    return {
      id: dados.id,
      pedido: dados.pedido,
      total: Number(dados.total),
      metodo: dados.metodo === "cartao" ? "cartao" : "pix",
      confirmado: legado ? false : dados.confirmado === true,
      qr_code: typeof dados.qr_code === "string" ? dados.qr_code : "",
      qr_code_url: typeof dados.qr_code_url === "string" ? dados.qr_code_url : null,
      ...(typeof dados.expires_at === "string" ? { expires_at: dados.expires_at } : {}),
      ...(typeof dados.codigo_rastreio === "string" ? { codigo_rastreio: dados.codigo_rastreio } : {}),
    };
  } catch { return null; }
}

export function lerPagamentoDaTela(): PagamentoNavegacao | null {
  const atual = sessionStorage.getItem(CHAVE_PAGAMENTO);
  if (atual) return normalizar(atual);
  const legado = sessionStorage.getItem(CHAVE_PIX_LEGADA);
  return legado ? normalizar(legado, true) : null;
}
