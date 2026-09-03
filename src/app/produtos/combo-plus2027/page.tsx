import type { Metadata } from "next";
import ComboPlusStore from "@/components/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/ComboPlusStore";
import { comboPlus2027 } from "@/components/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/produto";

/* Mesma tela do Combo Plus, com o produto de 2027 e os recursos de campanha:
   notificações de compra e contador do 1º lote. A rota original segue sem
   eles — o que muda entre as duas são só estas props. */
export const metadata: Metadata = {
  title: "Lançamento Combo Plus | 2027",
  description: "Lançamento Combo Plus 2027 Café com Deus Pai com frete grátis.",
  alternates: { canonical: "/produtos/combo-plus2027" },
};

export default function ComboPlus2027Page() {
  return (
    <ComboPlusStore
      produto={comboPlus2027}
      notificacoes
      estoque={{ lote: 400, restantes: 139, minutos: 29, chave: "cdp-lote-combo-plus2027" }}
    />
  );
}
