"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { SiteFooter, SiteHeader } from "@/components/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/HeaderFooter";
import { useCart } from "@/components/sites/cafecomdeuspai-com-8456844d/useCart";

const CartDrawer = dynamic(() => import("@/components/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/CartDrawer"), { ssr: false });

/* Cabeçalho, sacola e rodapé para páginas que não são de produto.
   As páginas de seção e de busca nasceram sem isso: abriam soltas, sem menu,
   sem carrinho e sem rodapé — o visitante ficava sem saída a não ser o botão
   voltar do navegador. */
export default function CascaLoja({ children }: { children: React.ReactNode }) {
  // null adia o primeiro carregamento; false mantém cupom e animação ao fechar.
  const [cartOpen, setCartOpen] = useState<boolean | null>(null);
  const cart = useCart();

  return (
    <>
      <SiteHeader cartCount={cart.quantity} onCartClick={() => setCartOpen(true)} />
      {children}
      <SiteFooter />
      {cartOpen !== null && <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
      />}
    </>
  );
}
