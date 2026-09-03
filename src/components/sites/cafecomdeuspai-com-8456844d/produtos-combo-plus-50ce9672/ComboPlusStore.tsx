"use client";

import { useState } from "react";
import { useCartQuantity } from "@/components/sites/cafecomdeuspai-com-8456844d/useCart";
import CartDrawer from "./CartDrawer";
import { SiteFooter, SiteHeader } from "./HeaderFooter";
import ProductPage from "./ProductPage";

export default function ComboPlusStore() {
  const [cartOpen, setCartOpen] = useState(false);
  const [cartQuantity, setCartQuantity] = useCartQuantity();

  function addToCart(quantity: number) {
    setCartQuantity(quantity);
    setCartOpen(true);
  }

  return (
    <div>
      <SiteHeader cartCount={cartQuantity} onCartClick={() => setCartOpen(true)} />
      <ProductPage onBuy={addToCart} />
      <SiteFooter />
      <CartDrawer
        open={cartOpen}
        quantity={Math.max(1, cartQuantity)}
        onClose={() => setCartOpen(false)}
        onQuantityChange={setCartQuantity}
      />
    </div>
  );
}
