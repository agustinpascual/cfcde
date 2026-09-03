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

const PRODUTOS_CAFE: Record<string, { nome: string; centavos: number }> = {
  "combo-plus": { nome: "Combo Plus | Frete grátis", centavos: 28990 },
  "cafe-com-deus-pai-vol-6-brochura-a-vida-que-voce-busca-esta-na-cura-que-voce-precisa": { nome: "Café com Deus Pai vol.6 + A vida que você busca", centavos: 9990 },
  "cafe-com-deus-pai-vol-6-brochura-a-vida-que-voce-busca-esta-na-cura-que-voce-precisa-caneca": { nome: "Café com Deus Pai vol.6 + A vida que você busca + caneca", centavos: 21990 },
  "2-canecas-cafe-com-deus-pai-vol-6": { nome: "2 canecas Café com Deus Pai", centavos: 19990 },
  "a-vida-que-voce-busca-esta-na-cura-que-voce-precisa-lata-alfajor-velutti-com-6-un-marca-texto": { nome: "A vida que você busca + alfajores + marca-texto", centavos: 14990 },
  "a-vida-que-voce-busca-esta-na-cura-que-voce-precisa-planner-marca-texto": { nome: "A vida que você busca + planner + marca-texto", centavos: 12990 },
  "planner-cafe-com-deus-pai-2025": { nome: "Planner Café com Deus Pai", centavos: 5990 },
  "a-vida-que-voce-busca-esta-na-cura-que-voce-precisa-cafe-com-deus-pai-brochura-vol-6-planner": { nome: "A vida que você busca + Café com Deus Pai + planner", centavos: 17990 },
  "2-livros-cafe-com-deus-pai-vol-6-brochura-2-canecas": { nome: "2 livros Café com Deus Pai + 2 canecas", centavos: 28990 },
  "combo-cafe-com-deus-pai-vol-6-brochura-lata-de-cafe-gourmet": { nome: "Café com Deus Pai + café gourmet", centavos: 10890 },
  "combo-cafe-com-deus-pai-2026-brochura-ecobag-copo-250ml": { nome: "Café com Deus Pai + ecobag + copo", centavos: 9990 },
  "cafe-com-deus-pai-2026-brochura-10-filtros-individuais": { nome: "Café com Deus Pai + 10 filtros", centavos: 7890 },
};

export function calcularTotalCafe(produtoSlug: string, qtd: number, frete: string) {
  const produto = PRODUTOS_CAFE[produtoSlug];
  if (!produto) throw new Error("Produto inválido");
  if (!Number.isInteger(qtd) || qtd < 1 || qtd > 20) throw new Error("Quantidade inválida");
  if (frete !== "pac" && frete !== "sedex") throw new Error("Forma de envio inválida");
  const subtotal = produto.centavos * qtd;
  const freteSelecionado = frete === "pac"
    ? { nome: "Correios - PAC", centavos: 0 }
    : { nome: "Correios - SEDEX", centavos: 2032 };
  return { kit: produto, subtotal, desconto: 0, frete: freteSelecionado, total: subtotal + freteSelecionado.centavos };
}
