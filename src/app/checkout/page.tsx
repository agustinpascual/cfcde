import type { Metadata } from "next";
import { Suspense } from "react";
import CheckoutView from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/checkout/CheckoutView";

export const metadata: Metadata = {
  title: "Finalizar a compra",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return <Suspense fallback={null}><CheckoutView /></Suspense>;
}
