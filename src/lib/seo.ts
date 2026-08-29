import type { Metadata } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bella-gummy.vercel.app";
const OG_IMG = "/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/images/og-compartilhamento.png";

/* Metadados de compartilhamento por página.
   Sem isto o Next herda o openGraph do layout inteiro, e toda página era
   compartilhada com o título e a URL da home. */
export function metadadosPagina({ titulo, descricao, caminho }: {
  titulo: string; descricao: string; caminho: string;
}): Metadata {
  const url = `${SITE}${caminho}`;
  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: caminho },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: "Bela Blue Beauty",
      title: titulo,
      description: descricao,
      url,
      images: [{ url: OG_IMG, width: 1200, height: 630, type: "image/png", alt: titulo }],
    },
    twitter: {
      card: "summary_large_image",
      title: titulo,
      description: descricao,
      images: [OG_IMG],
    },
  };
}
