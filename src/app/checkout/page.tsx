import type { Metadata } from "next";
import CheckoutView from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/checkout/CheckoutView";

export const metadata: Metadata = {
  title: "Finalizar a compra",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return <CheckoutView />;
}
