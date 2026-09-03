import type { Metadata } from "next";
import CheckoutCafe from "@/components/sites/cafecomdeuspai-com-8456844d/checkout/CheckoutCafe";
import { OFERTAS_POR_SLUG } from "@/components/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/produto";
import { getProductBySlug } from "@/components/sites/cafecomdeuspai-com-8456844d/shared/productCatalog";

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

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ produto?: string | string[] }> }) {
  const rawSlug = (await searchParams).produto;
  const slug = typeof rawSlug === "string" ? rawSlug : "combo-plus";
  const oferta = OFERTAS_POR_SLUG[slug];
  const catalogProduct = getProductBySlug(slug);
  const product = oferta ? oferta : catalogProduct ? {
    slug: catalogProduct.slug,
    name: catalogProduct.name,
    image: catalogProduct.image,
    priceCents: catalogProduct.priceCents,
    originalPrice: catalogProduct.originalPrice,
  } : comboPlus;
  return <CheckoutCafe product={product} />;
}
