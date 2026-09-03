const assetRoot = "/sites/cafecomdeuspai-com-8456844d/root-8a5edab2";

export type ProductCategory = "Lançamento" | "Destaques" | "Imperdível";

export type CatalogProduct = {
  slug: string;
  name: string;
  priceCents: number;
  price: string;
  originalPrice: string | null;
  installment: string;
  image: string;
  category: ProductCategory;
  description: string;
  sku: string;
};

export const PRODUCTS = [
  {
    slug: "cafe-com-deus-pai-vol-6-brochura-a-vida-que-voce-busca-esta-na-cura-que-voce-precisa",
    name: "Café com Deus Pai vol.6 (brochura) + A vida que você busca está na cura que você precisa",
    priceCents: 9990,
    price: "R$99,90",
    originalPrice: "R$181,80",
    installment: "4 de R$24,98",
    image: `${assetRoot}/asset-006.webp`,
    category: "Lançamento",
    description: "Dois livros para transformar sua rotina de fé: o devocional Café com Deus Pai volume 6, em edição brochura, e A vida que você busca está na cura que você precisa.",
    sku: "CCDP-COMBO-LIVROS-006",
  },
  {
    slug: "cafe-com-deus-pai-vol-6-brochura-a-vida-que-voce-busca-esta-na-cura-que-voce-precisa-caneca",
    name: "Café com Deus Pai vol.6 (brochura) + A vida que você busca está na cura que você precisa + caneca",
    priceCents: 21990,
    price: "R$219,90",
    originalPrice: "R$351,70",
    installment: "4 de R$54,98",
    image: `${assetRoot}/asset-007.webp`,
    category: "Lançamento",
    description: "Combo com os livros Café com Deus Pai volume 6 e A vida que você busca está na cura que você precisa, acompanhado de uma caneca exclusiva.",
    sku: "CCDP-COMBO-LIVROS-CANECA-006",
  },
  {
    slug: "2-canecas-cafe-com-deus-pai-vol-6",
    name: "2 canecas Café com Deus Pai (vol.6)",
    priceCents: 19990,
    price: "R$199,90",
    originalPrice: "R$259,80",
    installment: "4 de R$49,98",
    image: `${assetRoot}/asset-008.webp`,
    category: "Lançamento",
    description: "Conjunto com duas canecas da coleção Café com Deus Pai volume 6, ideal para compartilhar seus momentos de pausa e devoção.",
    sku: "CCDP-2-CANECAS-006",
  },
  {
    slug: "a-vida-que-voce-busca-esta-na-cura-que-voce-precisa-lata-alfajor-velutti-com-6-un-marca-texto",
    name: "A vida que você busca está na cura que você precisa + Lata Alfajor Velutti com 6 un + marca-texto",
    priceCents: 14990,
    price: "R$149,90",
    originalPrice: "R$169,70",
    installment: "4 de R$37,48",
    image: `${assetRoot}/asset-009.webp`,
    category: "Lançamento",
    description: "Kit presenteável com o livro A vida que você busca está na cura que você precisa, lata com seis alfajores Velutti e marca-texto.",
    sku: "AVQVB-COMBO-ALFAJOR-MT",
  },
  {
    slug: "a-vida-que-voce-busca-esta-na-cura-que-voce-precisa-planner-marca-texto",
    name: "A vida que você busca está na cura que você precisa + Planner + marca-texto",
    priceCents: 12990,
    price: "R$129,90",
    originalPrice: "R$174,70",
    installment: "4 de R$32,48",
    image: `${assetRoot}/asset-012.webp`,
    category: "Destaques",
    description: "Combo para leitura e organização com o livro A vida que você busca está na cura que você precisa, planner e marca-texto.",
    sku: "AVQVB-COMBO-PLANNER-MT",
  },
  {
    slug: "planner-cafe-com-deus-pai-2025",
    name: "Planner Café com Deus Pai",
    priceCents: 5990,
    price: "R$59,90",
    originalPrice: "R$126,90",
    installment: "4 de R$14,98",
    image: `${assetRoot}/asset-013.webp`,
    category: "Destaques",
    description: "Planner Café com Deus Pai para organizar compromissos, planos e momentos de reflexão ao longo do ano.",
    sku: "CCDP-PLANNER-2025",
  },
  {
    slug: "a-vida-que-voce-busca-esta-na-cura-que-voce-precisa-cafe-com-deus-pai-brochura-vol-6-planner",
    name: "A vida que você busca está na cura que você precisa + Café com Deus Pai (brochura) vol.6 + Planner",
    priceCents: 17990,
    price: "R$179,90",
    originalPrice: "R$271,70",
    installment: "4 de R$44,98",
    image: `${assetRoot}/asset-014.webp`,
    category: "Destaques",
    description: "Kit completo com dois livros — A vida que você busca está na cura que você precisa e Café com Deus Pai volume 6 — mais um planner.",
    sku: "CCDP-COMBO-2L-PLANNER-006",
  },
  {
    slug: "2-livros-cafe-com-deus-pai-vol-6-brochura-2-canecas",
    name: "2 livros Café com Deus Pai vol. 6 (brochura) + 2 canecas",
    priceCents: 28990,
    price: "R$289,90",
    originalPrice: "R$483,60",
    installment: "4 de R$72,48",
    image: `${assetRoot}/asset-015.webp`,
    category: "Destaques",
    description: "Combo para duas pessoas com dois exemplares em brochura de Café com Deus Pai volume 6 e duas canecas da coleção.",
    sku: "CCDP-COMBO-2L-2C-006",
  },
  {
    slug: "combo-cafe-com-deus-pai-vol-6-brochura-lata-de-cafe-gourmet",
    name: "Combo: Café com Deus Pai vol.6 (brochura) + Lata de café gourmet",
    priceCents: 10890,
    price: "R$108,90",
    originalPrice: "R$161,80",
    installment: "4 de R$27,23",
    image: `${assetRoot}/asset-017.webp`,
    category: "Imperdível",
    description: "O devocional Café com Deus Pai volume 6, em edição brochura, acompanhado de uma lata de café gourmet.",
    sku: "CCDP-COMBO-CAFE-006",
  },
  {
    slug: "combo-cafe-com-deus-pai-2026-brochura-ecobag-copo-250ml",
    name: "Combo Café com Deus Pai vol.6 (brochura) + Ecobag + Copo (250ml)",
    priceCents: 9990,
    price: "R$99,90",
    originalPrice: "R$161,70",
    installment: "4 de R$24,98",
    image: `${assetRoot}/asset-018.webp`,
    category: "Imperdível",
    description: "Combo Café com Deus Pai com livro volume 6 em brochura, ecobag exclusiva e copo de 250 ml.",
    sku: "CCDP-COMBO-ECOBAG-COPO-006",
  },
  {
    slug: "cafe-com-deus-pai-2026-brochura-10-filtros-individuais",
    name: "Café com Deus Pai vol.6 (brochura) + 10 filtros individuais",
    priceCents: 7890,
    price: "R$78,90",
    originalPrice: "R$146,80",
    installment: "4 de R$19,73",
    image: `${assetRoot}/asset-019.webp`,
    category: "Imperdível",
    description: "Livro Café com Deus Pai volume 6, em edição brochura, acompanhado de dez filtros individuais de café.",
    sku: "CCDP-COMBO-10-FILTROS-006",
  },
] as const satisfies readonly CatalogProduct[];

export function getProductBySlug(slug: string): CatalogProduct | undefined {
  return PRODUCTS.find((product) => product.slug === slug);
}
