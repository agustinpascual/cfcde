"use client";

import { useState } from "react";
import CartDrawer from "@/components/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/CartDrawer";
import { SiteFooter, SiteHeader } from "@/components/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/HeaderFooter";
import { useCart } from "@/components/sites/cafecomdeuspai-com-8456844d/useCart";

/* Cabeçalho, sacola e rodapé para páginas que não são de produto.
   As páginas de seção e de busca nasceram sem isso: abriam soltas, sem menu,
   sem carrinho e sem rodapé — o visitante ficava sem saída a não ser o botão
   voltar do navegador. */
export default function CascaLoja({ children }: { children: React.ReactNode }) {
  const [cartOpen, setCartOpen] = useState(false);
  const cart = useCart();

  return (
    <>
      <SiteHeader cartCount={cart.quantity} onCartClick={() => setCartOpen(true)} />
      {children}
      <SiteFooter />
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
      />
    </>
  );
}
