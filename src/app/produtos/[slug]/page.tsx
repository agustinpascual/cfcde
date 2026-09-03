import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CatalogProductStore from "@/components/sites/cafecomdeuspai-com-8456844d/product-catalog/CatalogProductStore";
import { PRODUCTS, getProductBySlug } from "@/components/sites/cafecomdeuspai-com-8456844d/shared/productCatalog";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return PRODUCTS.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return { title: "Produto não encontrado" };
  return {
    title: `${product.name} | Café com Deus Pai`,
    description: product.description,
    openGraph: { title: product.name, description: product.description, images: [product.image] },
  };
}

export default async function CatalogProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();
  return <CatalogProductStore product={product} />;
}
