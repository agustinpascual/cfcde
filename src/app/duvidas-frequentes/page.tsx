import type { Metadata } from "next";
import PaginaInstitucional from "@/components/sites/cafecomdeuspai-com-8456844d/institucional/PaginaInstitucional";
import s from "@/components/sites/cafecomdeuspai-com-8456844d/institucional/pagina.module.css";
import { metadadosPagina } from "@/lib/seo";

export const metadata: Metadata = metadadosPagina({
  titulo: "Dúvidas frequentes — Café com Deus Pai",
  descricao: "Respostas sobre pagamentos, pedidos e entregas da loja Café com Deus Pai.",
  caminho: "/duvidas-frequentes",
});

export default function Page() {
  return (
    <PaginaInstitucional titulo="Dúvidas frequentes" subtitulo="Respostas rápidas sobre pagamento, envio e acompanhamento do pedido.">
      <div className={s.faq}>
        <details><summary>Quais são as formas de pagamento?</summary><p>O checkout mostra as opções disponíveis para a compra, incluindo Pix e cartão de crédito quando habilitado.</p></details>
        <details><summary>Como acompanho meu pedido?</summary><p>Depois do despacho, o código de rastreamento é enviado ao e-mail informado na compra. Você também pode usar o link “Acompanhe o seu pedido” no rodapé.</p></details>
        <details><summary>Como sei o prazo de entrega?</summary><p>Informe seu CEP na página do produto ou no checkout. O prazo e as modalidades disponíveis aparecem antes da confirmação do pagamento.</p></details>
        <details><summary>Não recebi o e-mail do pedido. O que faço?</summary><p>Confira as pastas de spam e lixeira e confirme se o endereço informado no checkout está correto. Se precisar, fale com o SAC levando o número do pedido.</p></details>
        <details><summary>Como solicito uma troca ou devolução?</summary><p>Entre em contato com o atendimento antes de enviar qualquer item. A equipe orientará os próximos passos conforme a situação do pedido.</p></details>
      </div>
    </PaginaInstitucional>
  );
}
