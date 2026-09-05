/* Injeta dado estruturado. O escape de "<" evita que um texto do catálogo
   feche a tag <script> e vire injeção. */
export default function JsonLd({ data }: { data: object | object[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
