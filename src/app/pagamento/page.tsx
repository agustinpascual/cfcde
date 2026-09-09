import type { Metadata } from "next";
import PagamentoPix from "./PagamentoPix";

/* Página de pagamento: não deve ser indexada nem aparecer no sitemap —
   só faz sentido para quem acabou de fechar um pedido. */
export const metadata: Metadata = {
  title: "Pagamento confirmado",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <PagamentoPix />;
}
