import type { Metadata } from "next";
import HomeStore from "@/components/sites/cafecomdeuspai-com-8456844d/root-8a5edab2/HomeStore";
import JsonLd from "@/components/seo/JsonLd";
import { jsonLdLoja, metadadosPagina } from "@/lib/seo";

export const metadata: Metadata = metadadosPagina({
  titulo: "Café com Deus Pai",
  descricao: "Loja oficial Café com Deus Pai — livros, canecas, cafés e combos especiais.",
  caminho: "/",
});

export default function Page() {
  return (
    <>
      <JsonLd data={jsonLdLoja()} />
      <HomeStore />
    </>
  );
}
