import type { Metadata } from "next";
import FormEntrar from "@/components/painel/FormEntrar";

export const metadata: Metadata = { title: "Entrar no painel", robots: { index: false, follow: false } };

export default function Page() {
  return <FormEntrar />;
}
