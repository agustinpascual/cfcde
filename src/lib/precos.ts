import "server-only";

/* Tabela de preços autoritativa. O checkout envia apenas o índice do kit e a
   quantidade; o valor cobrado é calculado AQUI. Se viesse do cliente, daria
   para adulterar o request e pagar R$ 1,00 num pedido de R$ 149,90. */
export const KITS_SERVIDOR = [
  { nome: "1 POTE", centavos: 8990 },
  { nome: "2 POTES", centavos: 11990 },
  { nome: "3 POTES", centavos: 14990 },
] as const;

export const DESCONTO_PIX = 0.05;
export const FRETES = {
  prioritario: { nome: "Envio Prioritário", centavos: 1990 },
  economico: { nome: "Econômico", centavos: 0 },
} as const;

export type IdFrete = keyof typeof FRETES;

export function calcularTotal(kitIndex: number, qtd: number, frete: IdFrete) {
  const kit = KITS_SERVIDOR[kitIndex];
  if (!kit) throw new Error("Kit inválido");
  if (!Number.isInteger(qtd) || qtd < 1 || qtd > 20) throw new Error("Quantidade inválida");
  const opcao = FRETES[frete];
  if (!opcao) throw new Error("Forma de envio inválida");

  const subtotal = kit.centavos * qtd;
  const desconto = Math.round(subtotal * DESCONTO_PIX);   // PIX sempre 5%
  const total = subtotal - desconto + opcao.centavos;
  return { kit, subtotal, desconto, frete: opcao, total };
}
