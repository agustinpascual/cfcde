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

/* Centavos que faltam para o total fechar no real cheio de baixo.
   A adquirente da PinPay arredonda o valor da transação; para o Pix nunca cair
   com centavos, descemos o total até o real inteiro e essa sobra entra como
   desconto — o cliente nunca paga centavos nem paga mais que os 5%. */
export const sobraAteRealCheio = (totalCentavos: number) => ((totalCentavos % 100) + 100) % 100;

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

/* O Pix incide sobre o valor já com cupom — é o que a pessoa vai pagar.
   `freteCentavos` entra na conta só para arredondar o TOTAL (produto + frete)
   ao real cheio; sem ele, o SEDEX (R$20,32) deixaria centavos no valor final. */
export function calcularDescontos({
  subtotalCentavos,
  produtoSlug,
  cupom = "",
  pagamento,
  freteCentavos = 0,
}: {
  subtotalCentavos: number;
  produtoSlug: string;
  cupom?: string;
  pagamento?: "pix" | "cartao";
  freteCentavos?: number;
}): Descontos {
  const valido = cupom ? cupomValido(cupom, produtoSlug) : null;
  const cupomCentavos = valido ? Math.round(subtotalCentavos * valido.percentual) : 0;
  const aposCupom = subtotalCentavos - cupomCentavos;
  let pixCentavos = 0;
  if (pagamento === "pix") {
    const pixNominal = Math.round(aposCupom * DESCONTO_PIX);
    const totalNominal = aposCupom - pixNominal + freteCentavos;
    pixCentavos = pixNominal + sobraAteRealCheio(totalNominal);   // total sem centavos
  }
  return {
    cupomAplicado: valido ? normalizarCupom(cupom) : null,
    cupomCentavos,
    pixCentavos,
    totalCentavos: cupomCentavos + pixCentavos,
  };
}
