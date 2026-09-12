import type { Metadata } from "next";
import { cookies } from "next/headers";
import CheckoutCafe from "@/components/sites/cafecomdeuspai-com-8456844d/checkout/CheckoutCafe";
import { OFERTAS_POR_SLUG } from "@/components/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/produto";
import { getProductBySlug } from "@/components/sites/cafecomdeuspai-com-8456844d/shared/productCatalog";
import { COOKIE_RECUPERACAO_CARRINHO, lerCheckoutRecuperado } from "@/lib/carrinho-recuperacao";

export const metadata: Metadata = {
  title: { absolute: "Finalizar a compra | Café com Deus Pai" },
  robots: { index: false, follow: false },
};

const comboPlus = {
  slug: "combo-plus",
  name: "Combo Plus | Frete grátis",
  image: "/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/combo-main.webp",
  priceCents: 28990,
  originalPrice: "R$513,90",
};

function resolverProduto(slug: string) {
  const oferta = OFERTAS_POR_SLUG[slug];
  const catalogProduct = getProductBySlug(slug);
  return oferta ? oferta : catalogProduct ? {
    slug: catalogProduct.slug,
    name: catalogProduct.name,
    image: catalogProduct.image,
    priceCents: catalogProduct.priceCents,
    originalPrice: catalogProduct.originalPrice,
  } : null;
}

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ produto?: string | string[]; itens?: string | string[]; origem?: string | string[] }> }) {
  const params = await searchParams;
  const token = params.origem === "recuperacao"
    ? (await cookies()).get(COOKIE_RECUPERACAO_CARRINHO)?.value ?? ""
    : "";
  const recuperado = token ? await lerCheckoutRecuperado(token) : null;
  const rawSlug = params.produto;
  const slug = typeof rawSlug === "string" ? rawSlug : "combo-plus";
  const bruto = recuperado?.itens.length
    ? recuperado.itens.map((item) => `${item.slug}:${item.quantidade}`).join(",")
    : typeof params.itens === "string" ? params.itens : "";
  const quantidades = new Map<string, number>();
  for (const trecho of bruto.split(",").slice(0, 20)) {
    const separador = trecho.lastIndexOf(":");
    const itemSlug = separador > 0 ? trecho.slice(0, separador) : "";
    const quantidade = Number(trecho.slice(separador + 1));
    if (!resolverProduto(itemSlug) || !Number.isInteger(quantidade) || quantidade < 1 || quantidade > 20) continue;
    quantidades.set(itemSlug, Math.min(20, (quantidades.get(itemSlug) ?? 0) + quantidade));
  }
  const products = [...quantidades].flatMap(([itemSlug, quantity]) => {
    const product = resolverProduto(itemSlug);
    return product ? [{ ...product, quantity }] : [];
  });
  if (!products.length) products.push({ ...(resolverProduto(slug) ?? comboPlus), quantity: 1 });
  return <>
    <link rel="preload" href="/api/pagamentos/config" as="fetch" crossOrigin="anonymous" />
    <CheckoutCafe products={products} prefill={recuperado?.prefill ?? null} />
  </>;
}
