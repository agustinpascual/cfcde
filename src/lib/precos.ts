import "server-only";
import { calcularDescontosCarrinho, sobraAteRealCheio } from "./promocoes";
import { PRODUCTS } from "@/components/sites/cafecomdeuspai-com-8456844d/shared/productCatalog";

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
  const descontoNominal = Math.round(subtotal * DESCONTO_PIX);   // PIX sempre 5%
  const totalNominal = subtotal - descontoNominal + opcao.centavos;
  const desconto = descontoNominal + sobraAteRealCheio(totalNominal);   // total sem centavos
  const total = subtotal - desconto + opcao.centavos;
  return { kit, subtotal, desconto, frete: opcao, total };
}

/* Combos do ComboPlusStore — não fazem parte do catálogo da vitrine, então
   ficam explícitos aqui. */
const COMBOS: Record<string, { nome: string; centavos: number }> = {
  "combo-plus": { nome: "Combo Plus | Frete grátis", centavos: 28990 },
  "combo-plus2027": { nome: "Lançamento Combo Plus | 2027", centavos: 8990 },
  "combo-plus2027-2un": { nome: "Lançamento Combo Plus | 2027 · 2 unidades", centavos: 12990 },
  /* Homologação de pagamento (/produto/testes). Remover depois de homologar. */
  "testes": { nome: "Produto de teste — homologação de pagamento", centavos: 1000 },
};

/* A tabela de preços do servidor é DERIVADA do catálogo da vitrine. Antes as
   duas listas eram mantidas à mão e dessincronizaram: os 24 produtos do vol.7
   apareciam na loja mas davam "Produto inválido" ao gerar o PIX. Derivando,
   todo produto que existe na vitrine é cobrável, com o mesmo preço exibido. */
const PRODUTOS_CAFE: Record<string, { nome: string; centavos: number }> = {
  ...COMBOS,
  ...Object.fromEntries(PRODUCTS.map((p) => [p.slug, { nome: p.name, centavos: p.priceCents }])),
};

/* Cupom e desconto Pix são recalculados aqui: do cliente vem só o código do
   cupom e a forma de pagamento, nunca o valor. */
export function calcularTotalCafe(
  produtoSlug: string,
  qtd: number,
  frete: string,
  opcoes: { cupom?: string; pagamento?: "pix" | "cartao" } = {},
) {
  return calcularCarrinhoCafe([{ produto: produtoSlug, qtd }], frete, opcoes);
}

export type ItemCarrinhoCafe = { produto: string; qtd: number };

/** Calcula uma sacola inteira usando exclusivamente o catálogo do servidor.
 * Slugs repetidos são consolidados e nenhum preço vindo do navegador é aceito. */
export function calcularCarrinhoCafe(
  itensBrutos: readonly ItemCarrinhoCafe[],
  frete: string,
  opcoes: { cupom?: string; pagamento?: "pix" | "cartao" } = {},
) {
  if (!Array.isArray(itensBrutos) || itensBrutos.length < 1 || itensBrutos.length > 20) throw new Error("Carrinho inválido");
  const quantidades = new Map<string, number>();
  for (const item of itensBrutos) {
    const produto = PRODUTOS_CAFE[item?.produto];
    if (!produto) throw new Error("Produto inválido");
    if (!Number.isInteger(item.qtd) || item.qtd < 1 || item.qtd > 20) throw new Error("Quantidade inválida");
    const total = (quantidades.get(item.produto) ?? 0) + item.qtd;
    if (total > 20) throw new Error("Quantidade inválida");
    quantidades.set(item.produto, total);
  }
  const quantidadeTotal = [...quantidades.values()].reduce((total, qtd) => total + qtd, 0);
  if (quantidadeTotal > 40) throw new Error("Quantidade total inválida");
  if (frete !== "pac" && frete !== "sedex") throw new Error("Forma de envio inválida");
  const itens = [...quantidades].map(([slug, quantidade]) => {
    const produto = PRODUTOS_CAFE[slug];
    return { slug, nome: produto.nome, quantidade, totalCentavos: produto.centavos * quantidade };
  });
  const subtotal = itens.reduce((total, item) => total + item.totalCentavos, 0);
  const freteSelecionado = frete === "pac"
    ? { nome: "Correios - PAC", centavos: 0 }
    : { nome: "Correios - SEDEX", centavos: 2032 };
  const descontos = calcularDescontosCarrinho({
    itens: itens.map((item) => ({ produtoSlug: item.slug, subtotalCentavos: item.totalCentavos })),
    cupom: opcoes.cupom,
    pagamento: opcoes.pagamento,
    freteCentavos: freteSelecionado.centavos,
  });
  const nomeCarrinho = itens.map((item) => `${item.quantidade}x ${item.nome}`).join(" + ");
  return {
    kit: { nome: nomeCarrinho, centavos: subtotal },
    itens,
    quantidadeTotal,
    subtotal,
    desconto: descontos.totalCentavos,
    cupom: descontos.cupomAplicado,
    descontoCupom: descontos.cupomCentavos,
    descontoPix: descontos.pixCentavos,
    frete: freteSelecionado,
    total: subtotal - descontos.totalCentavos + freteSelecionado.centavos,
  };
}
