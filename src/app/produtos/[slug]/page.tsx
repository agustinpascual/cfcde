import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CatalogProductStore from "@/components/sites/cafecomdeuspai-com-8456844d/product-catalog/CatalogProductStore";
import JsonLd from "@/components/seo/JsonLd";
import { marca } from "@/components/storefront/brand";
import { jsonLdProduto, url } from "@/lib/seo";
import { PRODUCTS, getProductBySlug } from "@/components/sites/cafecomdeuspai-com-8456844d/shared/productCatalog";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return PRODUCTS.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return { title: "Produto não encontrado" };
  /* Sem sufixo na mão: o template do layout já acrescenta o nome da loja. */
  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: `/produtos/${product.slug}` },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: marca.nome,
      title: product.name,
      description: product.description,
      url: url(`/produtos/${product.slug}`),
      images: [{ url: product.image }],
    },
    twitter: { card: "summary_large_image", title: product.name, description: product.description, images: [product.image] },
  };
}

export default async function CatalogProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();
  return (
    <>
      <JsonLd
        data={jsonLdProduto({
          nome: product.name,
          descricao: product.description,
          imagem: product.image,
          caminho: `/produtos/${product.slug}`,
          preco: product.priceCents / 100,
          sku: product.sku,
        })}
      />
      <CatalogProductStore product={product} />
    </>
  );
}
