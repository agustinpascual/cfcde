import type { Metadata } from "next";
import CheckoutCafe from "@/components/sites/cafecomdeuspai-com-8456844d/checkout/CheckoutCafe";

export const metadata: Metadata = {
  title: { absolute: "Finalizar a compra | Café com Deus Pai" },
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return <CheckoutCafe />;
}
