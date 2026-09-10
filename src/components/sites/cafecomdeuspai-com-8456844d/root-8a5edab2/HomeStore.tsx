"use client";
import { useState } from "react";
import CartDrawer from "@/components/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/CartDrawer";
import { useCart } from "@/components/sites/cafecomdeuspai-com-8456844d/useCart";
import HomeCommerce from "./HomeCommerce";
import HomeHero from "./HomeHero";
import HomeLower from "./HomeLower";

export default function HomeStore() {
  const [cartOpen, setCartOpen] = useState(false);
  const cart = useCart();
  return <div data-cdp-home><HomeHero cartCount={cart.quantity} onCartClick={() => setCartOpen(true)} /><main><HomeCommerce /><HomeLower /></main><CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} cart={cart} /></div>;
}
