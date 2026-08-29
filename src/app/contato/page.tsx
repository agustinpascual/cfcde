import type { Metadata } from "next";
import PaginaInstitucional from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/institucional/PaginaInstitucional";
import FormContato from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/institucional/FormContato";
import s from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/institucional/pagina.module.css";
import { WHATSAPP_LINK, WHATSAPP_NUMERO } from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/institucional/contato";

export const metadata: Metadata = {
  title: "Fale conosco — Bela Blue Beauty",
  description: "Envie sua mensagem para o time da Bela Blue Beauty.",
};

export default function Page() {
  return (
    <PaginaInstitucional
      titulo="Fale conosco"
      subtitulo="Preencha o formulário e nosso time entra em contato. Se preferir, chame no WhatsApp."
    >
      <div className={s.destaque}>
        <p>
          Atendimento de segunda a sexta, das 8h às 18h, e sábado das 8h às 16h.
          WhatsApp <strong>{WHATSAPP_NUMERO}</strong>.
        </p>
        <a className={s.wpp} href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>
      </div>

      <h2>Envie uma mensagem</h2>
      <FormContato />
    </PaginaInstitucional>
  );
}
