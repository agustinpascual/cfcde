import type { MetadataRoute } from "next";
import { PRODUCTS } from "@/components/sites/cafecomdeuspai-com-8456844d/shared/productCatalog";
import { SITE } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const agora = new Date();
  const pagina = (
    caminho: string,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
    priority: number,
  ) => ({ url: `${SITE}${caminho}`, lastModified: agora, changeFrequency, priority });

  return [
    pagina("/", "daily", 1),
    /* As páginas de produto são o que traz busca — prioridade acima das
       institucionais. */
    pagina("/produtos/combo-plus", "weekly", 0.9),
    pagina("/produtos/combo-plus2027", "weekly", 0.9),
    ...PRODUCTS.map(({ slug }) => pagina(`/produtos/${slug}`, "weekly", 0.8)),
    pagina("/vitrine", "weekly", 0.6),
    pagina("/duvidas-frequentes", "monthly", 0.6),
    pagina("/contato", "yearly", 0.5),
    pagina("/sobre", "yearly", 0.4),
    pagina("/politica-de-privacidade", "yearly", 0.3),
  ];
}
