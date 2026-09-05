import type { Metadata } from "next";
import { marca } from "@/components/storefront/brand";

/* Endereço público do site. É a base de toda URL absoluta (canonical, Open
   Graph, sitemap, JSON-LD) — defina NEXT_PUBLIC_SITE_URL no ambiente assim
   que o domínio estiver apontado, senão os buscadores indexam o placeholder. */
export const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://cafecomdeuspai.vercel.app").replace(/\/$/, "");

export const url = (caminho: string) => `${SITE}${caminho}`;

/* Metadados de compartilhamento por página.
   Sem isto o Next herda o openGraph do layout inteiro, e toda página era
   compartilhada com o título e a URL da home. */
export function metadadosPagina({ titulo, descricao, caminho }: {
  titulo: string; descricao: string; caminho: string;
}): Metadata {
  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: caminho },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: marca.nome,
      title: titulo,
      description: descricao,
      url: url(caminho),
      /* Declarada na mão: o Next só injeta src/app/opengraph-image.png
         sozinho quando a página não define openGraph. */
      images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: marca.nome }],
    },
    twitter: {
      card: "summary_large_image",
      title: titulo,
      description: descricao,
      images: ["/opengraph-image.png"],
    },
  };
}

type DadosProduto = {
  nome: string;
  descricao: string;
  imagem: string;
  caminho: string;
  preco: number;
  /* Quando a página vende pacotes, o maior valor fecha a faixa de preço. */
  precoMaximo?: number;
  sku?: string;
};

/* Rich result de produto: nome, foto, preço e disponibilidade.
   Sem avaliação de propósito — nota agregada só entra aqui quando vier de
   avaliação real, senão é dado estruturado falso e o Google pune. */
export function jsonLdProduto({ nome, descricao, imagem, caminho, preco, precoMaximo, sku }: DadosProduto) {
  const oferta = precoMaximo && precoMaximo !== preco
    ? {
        "@type": "AggregateOffer",
        lowPrice: preco.toFixed(2),
        highPrice: precoMaximo.toFixed(2),
        offerCount: 2,
      }
    : { "@type": "Offer", price: preco.toFixed(2) };

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: nome,
    description: descricao,
    image: [url(imagem)],
    ...(sku ? { sku } : {}),
    brand: { "@type": "Brand", name: marca.nome },
    offers: {
      ...oferta,
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
      url: url(caminho),
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: { "@type": "MonetaryAmount", value: "0", currency: "BRL" },
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "BR" },
      },
    },
  };
}

export function jsonLdLoja() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: marca.nome,
      url: SITE,
      logo: url("/icon.png"),
      description: marca.tagline,
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+55 47 3224-9292",
        contactType: "customer service",
        areaServed: "BR",
        availableLanguage: "Portuguese",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: marca.nome,
      url: SITE,
      inLanguage: "pt-BR",
    },
  ];
}
