/* Regras de desconto compartilhadas entre a loja e o servidor.
   O cliente usa para MOSTRAR o valor; quem cobra é lib/precos.ts, que
   recalcula tudo a partir daqui — o código do cupom é a única coisa que
   viaja do navegador. */

export const DESCONTO_PIX = 0.05;

export type Cupom = {
  percentual: number;
  /* Quando presente, o cupom só vale para estes pacotes. */
  produtos?: string[];
};

export const CUPONS: Record<string, Cupom> = {
  CAFECOMDEUS27: {
    percentual: 0.04,
    produtos: ["combo-plus2027", "combo-plus2027-2un"],
  },
};

export const normalizarCupom = (codigo: string) => codigo.trim().toUpperCase();

export function cupomValido(codigo: string, produtoSlug: string) {
  const cupom = CUPONS[normalizarCupom(codigo)];
  if (!cupom) return null;
  if (cupom.produtos && !cupom.produtos.includes(produtoSlug)) return null;
  return cupom;
}

export type Descontos = {
  cupomAplicado: string | null;
  cupomCentavos: number;
  pixCentavos: number;
  totalCentavos: number;
};

/* O Pix incide sobre o valor já com cupom — é o que a pessoa vai pagar. */
export function calcularDescontos({
  subtotalCentavos,
  produtoSlug,
  cupom = "",
  pagamento,
}: {
  subtotalCentavos: number;
  produtoSlug: string;
  cupom?: string;
  pagamento?: "pix" | "cartao";
}): Descontos {
  const valido = cupom ? cupomValido(cupom, produtoSlug) : null;
  const cupomCentavos = valido ? Math.round(subtotalCentavos * valido.percentual) : 0;
  const aposCupom = subtotalCentavos - cupomCentavos;
  const pixCentavos = pagamento === "pix" ? Math.round(aposCupom * DESCONTO_PIX) : 0;
  return {
    cupomAplicado: valido ? normalizarCupom(cupom) : null,
    cupomCentavos,
    pixCentavos,
    totalCentavos: cupomCentavos + pixCentavos,
  };
}
