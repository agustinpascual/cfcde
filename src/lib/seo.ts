import type { Metadata } from "next";
import { marca } from "@/components/storefront/brand";

/* Defina NEXT_PUBLIC_SITE_URL no ambiente quando o domínio estiver apontado. */
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://exemplo.com.br";

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
      siteName: marca.nome,
      title: titulo,
      description: descricao,
      url,
      /* Sem imagem de compartilhamento ainda — adicione um PNG 1200x630
         em /public e referencie aqui. */
    },
    twitter: {
      card: "summary_large_image",
      title: titulo,
      description: descricao,
    },
  };
}
