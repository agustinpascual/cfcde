"use client";
import { useState } from "react";
import CartDrawer from "@/components/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/CartDrawer";
import { useCartQuantity } from "@/components/sites/cafecomdeuspai-com-8456844d/useCart";
import HomeCommerce from "./HomeCommerce";
import HomeHero from "./HomeHero";
import HomeLower from "./HomeLower";
import ScrollReveal from "./ScrollReveal";

export default function HomeStore() {
  const [cartOpen, setCartOpen] = useState(false);
  const [quantity, setQuantity] = useCartQuantity();
  return <div data-cdp-home><ScrollReveal /><HomeHero cartCount={quantity} onCartClick={() => setCartOpen(true)} /><main><HomeCommerce /><HomeLower /></main><CartDrawer open={cartOpen} quantity={quantity} onClose={() => setCartOpen(false)} onQuantityChange={setQuantity} /></div>;
}
