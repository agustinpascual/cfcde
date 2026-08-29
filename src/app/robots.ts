import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bella-gummy.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // checkout e API ficam fora do índice — são páginas transacionais
      { userAgent: "*", allow: "/", disallow: ["/checkout", "/api/"] },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
