import { PERGUNTAS_TEXTO } from "./perguntas";

/* FAQPage em JSON-LD — ajuda o Google a entender as respostas da página. */
export default function FaqDados() {
  const dados = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: PERGUNTAS_TEXTO.map((q) => ({
      "@type": "Question",
      name: q.p,
      acceptedAnswer: { "@type": "Answer", text: q.r },
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dados) }} />;
}
