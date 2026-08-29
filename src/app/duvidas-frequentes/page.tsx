import type { Metadata } from "next";
import { metadadosPagina } from "@/lib/seo";
import PaginaInstitucional from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/institucional/PaginaInstitucional";
import Faq from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/institucional/Faq";
import FaqDados from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/institucional/FaqDados";

export const metadata: Metadata = metadadosPagina({
  titulo: "Dúvidas frequentes — Bela Blue Beauty",
  descricao: "Prazos de entrega, formas de envio, entrega por motoboy e outras dúvidas comuns.",
  caminho: "/duvidas-frequentes",
});

export default function Page() {
  return (
    <PaginaInstitucional
      titulo="Dúvidas frequentes"
      subtitulo="As perguntas que mais recebemos sobre envio, prazos e entrega."
    >
      <FaqDados />
      <Faq />
    </PaginaInstitucional>
  );
}
