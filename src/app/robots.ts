import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        /* Fora do índice: transacional (checkout, pagamento), administrativo
           (painel) e as rotas de serviço. */
        disallow: ["/checkout", "/pagamento/", "/painel", "/descadastro", "/api/"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
