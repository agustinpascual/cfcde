import { kits, produto, resumoAvaliacoes, reviews } from "./data";

/* JSON-LD de Produto para rich results no Google.
   A aggregateRating precisa espelhar avaliações reais e verificáveis — o
   Google remove o rich result (e pode penalizar) se não sustentar. */
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bella-gummy.vercel.app";
const preco = (v: string) => Number(v.replace(/[^\d,]/g, "").replace(",", ".")).toFixed(2);

export default function DadosEstruturados() {
  const dados = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE}/#organizacao`,
        name: "Bela Blue Beauty",
        url: SITE,
        logo: `${SITE}/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/images/00-comprar-bela-power-black-prazo-e.png`,
        contactPoint: {
          "@type": "ContactPoint",
          telephone: "+55-47-99703-6656",
          contactType: "customer service",
          areaServed: "BR",
          availableLanguage: "Portuguese",
        },
      },
      {
        "@type": "Product",
        "@id": `${SITE}/#produto`,
        name: produto.nome,
        description:
          "Suplemento alimentar em gomas mastigáveis da Bela Blue Beauty. Prático de tomar, sem água e sem preparo.",
        image: kits.map((k) => `${SITE}${k.imagem}`),
        brand: { "@type": "Brand", name: "Bela Blue Beauty" },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: resumoAvaliacoes.media,
          reviewCount: resumoAvaliacoes.total,
          bestRating: 5,
          worstRating: 1,
        },
        review: reviews.slice(0, 5).map((r) => ({
          "@type": "Review",
          author: { "@type": "Person", name: r.autor },
          datePublished: r.data.split("/").reverse().join("-"),
          reviewRating: { "@type": "Rating", ratingValue: r.estrelas, bestRating: 5 },
          reviewBody: r.texto,
        })),
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "BRL",
          lowPrice: preco(kits[0].total),
          highPrice: preco(kits[kits.length - 1].total),
          offerCount: kits.length,
          availability: "https://schema.org/InStock",
          url: SITE,
          seller: { "@id": `${SITE}/#organizacao` },
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // conteúdo é gerado aqui, não vem de entrada do usuário
      dangerouslySetInnerHTML={{ __html: JSON.stringify(dados) }}
    />
  );
}
