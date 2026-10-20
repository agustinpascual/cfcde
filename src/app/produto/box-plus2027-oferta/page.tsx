import ComboPlusStore from "@/components/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/ComboPlusStore";
import { comboPlus2027Oferta } from "@/components/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/produto";
import JsonLd from "@/components/seo/JsonLd";
import { jsonLdProduto, metadadosPagina } from "@/lib/seo";

const descricao =
  "Lançamento Combo Plus 2027 Café com Deus Pai por R$89,90, ou duas unidades por R$129,90, com frete grátis para todo o Brasil.";
const caminho = "/produto/box-plus2027-oferta";
const [avulso, dupla] = comboPlus2027Oferta.ofertas;

export const dynamic = "force-dynamic";
export const metadata = metadadosPagina({ titulo: comboPlus2027Oferta.nome, descricao, caminho });

export default function BoxPlus2027OfertaPage() {
  return (
    <>
      <JsonLd
        data={jsonLdProduto({
          nome: comboPlus2027Oferta.nome,
          descricao,
          imagem: comboPlus2027Oferta.imagem,
          caminho,
          preco: avulso.preco,
          precoMaximo: dupla.preco,
          sku: avulso.slug,
        })}
      />
      <ComboPlusStore
        produto={comboPlus2027Oferta}
        notificacoes
        estoque={{ lote: 400, restantes: 139, minutos: 29, chave: "cdp-lote-combo-plus2027-oferta" }}
        cupomSaida={{ codigo: "CAFECOMDEUS27", percentual: 4 }}
      />
    </>
  );
}
