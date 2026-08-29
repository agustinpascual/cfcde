import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bella-gummy.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const agora = new Date();
  return [
    { url: `${SITE}/`, lastModified: agora, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/sobre`, lastModified: agora, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE}/duvidas-frequentes`, lastModified: agora, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/politica-de-privacidade`, lastModified: agora, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/contato`, lastModified: agora, changeFrequency: "yearly", priority: 0.5 },
  ];
}
