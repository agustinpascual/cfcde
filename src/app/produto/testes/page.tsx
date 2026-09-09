import type { Metadata } from "next";
import ComboPlusStore from "@/components/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/ComboPlusStore";
import { produtoTestes } from "@/components/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/produto";

/* Página de homologação: R$10 para testar cartão (3DS) e PIX com valor baixo.
   Não indexada e fora do sitemap; ainda assim é uma compra real na conta da
   loja. Remover depois da homologação. */
export const metadata: Metadata = {
  title: { absolute: "Produto de teste | Café com Deus Pai" },
  robots: { index: false, follow: false, nocache: true },
};

export default function TestesPage() {
  return <ComboPlusStore produto={produtoTestes} />;
}
