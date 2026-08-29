import type { Metadata } from "next";
import PagamentoView from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/pagamento/PagamentoView";

export const metadata: Metadata = {
  title: "Pagamento via PIX",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PagamentoView id={id} />;
}
