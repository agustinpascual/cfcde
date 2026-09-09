import type { Metadata } from "next";
import PaginaInstitucional from "@/components/sites/cafecomdeuspai-com-8456844d/institucional/PaginaInstitucional";
import { metadadosPagina } from "@/lib/seo";

export const metadata: Metadata = metadadosPagina({
  titulo: "Termos de uso — Café com Deus Pai",
  descricao: "Condições de uso da loja online Café com Deus Pai.",
  caminho: "/termos-de-uso",
});

export default function Page() {
  return (
    <PaginaInstitucional titulo="Termos de uso" subtitulo="Condições gerais para navegar e comprar na loja online.">
      <h2>Informações da loja</h2>
      <p>Preços, disponibilidade, características dos produtos, opções de entrega e formas de pagamento são apresentados durante a navegação e confirmados no checkout.</p>
      <h2>Pedidos e pagamentos</h2>
      <p>O envio do pedido não garante a aprovação do pagamento. A confirmação ocorre de acordo com o retorno do provedor responsável pela forma de pagamento escolhida.</p>
      <h2>Uso responsável</h2>
      <p>Ao utilizar o site, o cliente se compromete a fornecer dados corretos e atualizados. Tentativas de fraude, interferência técnica ou uso indevido podem resultar no bloqueio da operação.</p>
      <h2>Atendimento</h2>
      <p>Em caso de dúvida sobre uma compra, entre em contato com o SAC pelo número <strong>(47) 3224-9292</strong>.</p>
    </PaginaInstitucional>
  );
}
