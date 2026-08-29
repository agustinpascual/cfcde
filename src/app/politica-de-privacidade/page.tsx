import type { Metadata } from "next";
import PaginaInstitucional from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/institucional/PaginaInstitucional";
import s from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/institucional/pagina.module.css";
import { WHATSAPP_NUMERO, WHATSAPP_LINK } from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/institucional/contato";

export const metadata: Metadata = {
  title: "Política de privacidade — Bela Blue Beauty",
  description: "Como a Bela Blue Beauty trata e protege os seus dados pessoais.",
};

export default function Page() {
  return (
    <PaginaInstitucional
      titulo="Política de privacidade"
      subtitulo="Como tratamos e protegemos as informações que você nos confia."
    >
      <h2>Política de privacidade</h2>
      <p>
        A nossa loja tem todo o respeito pela privacidade e garante o sigilo total das suas
        informações fornecidas no momento da sua compra. Suas informações pessoais são armazenadas
        em nosso banco de dados no intuito de estreitar o nosso relacionamento por meio de e-mails,
        mala-direta, dentre outras maneiras de interação.
      </p>

      <div className={s.destaque}>
        <p>
          O número do seu cartão é usado somente no processamento da compra, de nenhuma maneira é
          salvo em nossos arquivos após a operação. São salvos apenas os seus dados pessoais.
        </p>
      </div>

      <p>
        Seu endereço de e-mail é utilizado para que possamos divulgar para você as nossas promoções
        e lançamentos, você pode cancelar a qualquer momento.
      </p>

      <h2>Fale com a gente</h2>
      <p>
        Caso tenha dúvidas ou sugestões sobre nossa política de privacidade, sinta-se à vontade e
        entre em contato conosco através do WhatsApp <strong>{WHATSAPP_NUMERO}</strong>.
      </p>
      <a className={s.wpp} href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
        Falar no WhatsApp
      </a>

      <p style={{ marginTop: 28 }}>
        Garantimos a segurança da sua compra e respeitamos a sua privacidade.
      </p>
    </PaginaInstitucional>
  );
}
