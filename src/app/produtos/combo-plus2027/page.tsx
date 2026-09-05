import ComboPlusStore from "@/components/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/ComboPlusStore";
import { comboPlus2027 } from "@/components/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/produto";
import JsonLd from "@/components/seo/JsonLd";
import { jsonLdProduto, metadadosPagina } from "@/lib/seo";

const descricao =
  "Lançamento Combo Plus 2027 Café com Deus Pai por R$89,90, ou duas unidades por R$129,90, com frete grátis para todo o Brasil.";
const caminho = "/produtos/combo-plus2027";
const [avulso, dupla] = comboPlus2027.ofertas;

export const metadata = metadadosPagina({ titulo: comboPlus2027.nome, descricao, caminho });

/* Mesma tela do Combo Plus, com o produto de 2027 e os recursos de campanha:
   notificações de compra e contador do 1º lote. A rota original segue sem
   eles — o que muda entre as duas são só estas props. */
export default function ComboPlus2027Page() {
  return (
    <>
      <JsonLd
        data={jsonLdProduto({
          nome: comboPlus2027.nome,
          descricao,
          imagem: comboPlus2027.imagem,
          caminho,
          preco: avulso.preco,
          precoMaximo: dupla.preco,
          sku: avulso.slug,
        })}
      />
      <ComboPlusStore
        produto={comboPlus2027}
        notificacoes
        estoque={{ lote: 400, restantes: 139, minutos: 29, chave: "cdp-lote-combo-plus2027" }}
        cupomSaida={{ codigo: "CAFECOMDEUS27", percentual: 4 }}
      />
    </>
  );
}
