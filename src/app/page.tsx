import type { Metadata } from "next";
import HomeStore from "@/components/sites/cafecomdeuspai-com-8456844d/root-8a5edab2/HomeStore";

export const metadata: Metadata = {
  title: "Café com Deus Pai",
  description: "Loja oficial Café com Deus Pai — livros, canecas, cafés e combos especiais.",
};

export default function Page() {
  return <HomeStore />;
}
