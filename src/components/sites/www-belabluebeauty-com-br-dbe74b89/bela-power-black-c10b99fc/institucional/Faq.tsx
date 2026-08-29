"use client";
import { useState } from "react";
import { WHATSAPP_LINK } from "./contato";
import s from "./pagina.module.css";

const PERGUNTAS: { p: string; r: React.ReactNode }[] = [
  {
    p: "Qual é o custo de envio?",
    r: <p>O custo de envio será mostrado com base ao total da compra e sua localização, no checkout, no momento antes da compra.</p>,
  },
  {
    p: "Como se realizam os envios para todo o Brasil?",
    r: <p>Correios — SEDEX e PAC.</p>,
  },
  {
    p: "Fiz um pedido via motoboy e foi entregue por Correios",
    r: (
      <>
        <p><strong>Entregas somente em Itajaí, Penha, Piçarras, Navegantes e Balneário Camboriú.</strong></p>
        <p>
          Não entregamos via motoboy em Ilhota, Itapema, Barra Velha, Brusque, bairro Canhanduba e área
          rural em Itajaí/SC, bairro Escalvados e bairro Estaleirinho em Balneário Camboriú, e área rural
          de qualquer uma dessas cidades.
        </p>
        <p>
          Caso no site você consiga realizar um pedido para estas cidades via motoboy — e bairros onde não
          entregamos — colocaremos internamente via Correios.
        </p>
      </>
    ),
  },
  {
    p: "Quando tarda em chegar o pedido?",
    r: (
      <>
        <p>
          O tempo de entrega dependerá do tipo de envio selecionado. Em geral, o prazo de entrega dos
          Correios leva entre 3 a 12 dias úteis após a aprovação do pagamento.
        </p>
        <p>
          Os pedidos são despachados em até 48 horas úteis após aprovação do pagamento, somadas ao prazo
          de entrega dos Correios.
        </p>
        <p>
          Para que a entrega ocorra da melhor forma, o processo depende da informação correta dos dados
          pessoais e endereço no pedido, bem como prazo de separação, preparo e coleta — não considerando
          finais de semana e feriados.
        </p>
      </>
    ),
  },
  {
    p: "Ainda tenho dúvidas. Como falo com vocês?",
    r: (
      <p>
        Mais informações ou dúvidas, entre em contato com nosso suporte{" "}
        <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" style={{ color: "var(--bb-navy)", fontWeight: 700, textDecoration: "underline" }}>
          pelo WhatsApp
        </a>.
      </p>
    ),
  },
];

export default function Faq() {
  const [aberta, setAberta] = useState<number | null>(0);
  return (
    <div className={s.faq}>
      {PERGUNTAS.map((item, i) => {
        const on = aberta === i;
        return (
          <div key={item.p} className={`${s.faqItem} ${on ? s.faqAberto : ""}`}>
            <button type="button" className={s.faqBotao} aria-expanded={on} aria-controls={`faq-${i}`}
              onClick={() => setAberta(on ? null : i)}>
              {item.p}
              <svg className={s.faqSeta} viewBox="0 0 24 24" width="18" height="18" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {/* sempre no DOM (escondido com [hidden]) para o buscador indexar
                todas as respostas, não só a do item aberto */}
            <div className={s.faqCorpo} hidden={!on} id={`faq-${i}`}>{item.r}</div>
          </div>
        );
      })}
    </div>
  );
}
