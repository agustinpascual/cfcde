"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useCart } from "@/components/sites/cafecomdeuspai-com-8456844d/useCart";
import HomeCommerce from "./HomeCommerce";
import HomeHero from "./HomeHero";
import HomeLower from "./HomeLower";
import ScrollReveal from "./ScrollReveal";

const CartDrawer = dynamic(() => import("@/components/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/CartDrawer"), { ssr: false });

export default function HomeStore() {
  const [cartOpen, setCartOpen] = useState(false);
  const cart = useCart();
  return <div data-cdp-home><ScrollReveal /><HomeHero cartCount={cart.quantity} onCartClick={() => setCartOpen(true)} /><main><HomeCommerce /><HomeLower /></main>{cartOpen ? <CartDrawer open onClose={() => setCartOpen(false)} cart={cart} /> : null}</div>;
}
