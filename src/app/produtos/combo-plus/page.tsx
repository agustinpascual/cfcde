import ComboPlusStore from "@/components/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/ComboPlusStore";
import { comboPlus } from "@/components/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/produto";
import JsonLd from "@/components/seo/JsonLd";
import { jsonLdProduto, metadadosPagina } from "@/lib/seo";

const descricao =
  "Combo Plus Café com Deus Pai: devocional vol.6, caneca, café gourmet, ecobag e mais, com frete grátis para todo o Brasil.";

export const metadata = metadadosPagina({
  titulo: comboPlus.nome,
  descricao,
  caminho: "/produtos/combo-plus",
});

export default function ComboPlusPage() {
  return (
    <>
      <JsonLd
        data={jsonLdProduto({
          nome: comboPlus.nome,
          descricao,
          imagem: comboPlus.imagem,
          caminho: "/produtos/combo-plus",
          preco: comboPlus.ofertas[0].preco,
          sku: comboPlus.ofertas[0].slug,
        })}
      />
      <ComboPlusStore />
    </>
  );
}
