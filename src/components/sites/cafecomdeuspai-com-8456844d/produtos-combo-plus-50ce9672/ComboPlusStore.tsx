"use client";

import { useState } from "react";
import PurchaseNotifications from "@/components/sites/cafecomdeuspai-com-8456844d/shared/PurchaseNotifications";
import type { EstoqueLote } from "@/components/sites/cafecomdeuspai-com-8456844d/shared/StockUrgency";
import { useCartQuantity } from "@/components/sites/cafecomdeuspai-com-8456844d/useCart";
import CartDrawer from "./CartDrawer";
import { SiteFooter, SiteHeader } from "./HeaderFooter";
import ProductPage from "./ProductPage";
import { comboPlus, type Produto } from "./produto";

type Props = {
  /* Sem nada, é a tela do Combo Plus original. */
  produto?: Produto;
  /* Ligados por página: hoje só /produtos/combo-plus2027 usa. */
  notificacoes?: boolean;
  estoque?: EstoqueLote;
};

export default function ComboPlusStore({ produto = comboPlus, notificacoes = false, estoque }: Props) {
  const [cartOpen, setCartOpen] = useState(false);
  const [cartQuantity, setCartQuantity] = useCartQuantity();
  /* A oferta escolhida sobe até aqui porque a sacola também precisa dela. */
  const [ofertaIndice, setOfertaIndice] = useState(0);
  const oferta = produto.ofertas[ofertaIndice] ?? produto.ofertas[0];

  function addToCart(quantity: number) {
    setCartQuantity(quantity);
    setCartOpen(true);
  }

  return (
    <div>
      <SiteHeader cartCount={cartQuantity} onCartClick={() => setCartOpen(true)} />
      <ProductPage
        produto={produto}
        oferta={oferta}
        onOferta={setOfertaIndice}
        onBuy={addToCart}
        estoque={estoque}
      />
      <SiteFooter />
      <CartDrawer
        productName={oferta.unidades > 1 ? `${produto.nome} · ${oferta.rotulo}` : produto.nome}
        productImage={produto.imagem}
        unitPrice={oferta.preco}
        productSlug={oferta.slug}
        open={cartOpen}
        quantity={Math.max(1, cartQuantity)}
        onClose={() => setCartOpen(false)}
        onQuantityChange={setCartQuantity}
      />
      {notificacoes ? <PurchaseNotifications imagem={produto.imagem} nome={produto.nome} /> : null}
    </div>
  );
}
