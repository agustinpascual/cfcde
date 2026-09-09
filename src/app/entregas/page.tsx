import type { Metadata } from "next";
import PaginaInstitucional from "@/components/sites/cafecomdeuspai-com-8456844d/institucional/PaginaInstitucional";
import s from "@/components/sites/cafecomdeuspai-com-8456844d/institucional/pagina.module.css";
import { RASTREIO_BASE } from "@/lib/rastreio";
import { metadadosPagina } from "@/lib/seo";

export const metadata: Metadata = metadadosPagina({
  titulo: "Entregas — Café com Deus Pai",
  descricao: "Informações sobre prazo, modalidades e rastreamento de pedidos.",
  caminho: "/entregas",
});

export default function Page() {
  return (
    <PaginaInstitucional titulo="Entregas" subtitulo="Consulte o frete antes da compra e acompanhe o pedido depois do envio.">
      <div className={s.cards}>
        <div className={s.card}><h2>Prazo e frete</h2><p>As opções disponíveis, o valor do frete e a previsão de entrega são mostrados depois que você informa o CEP.</p></div>
        <div className={s.card}><h2>Despacho</h2><p>Depois da confirmação do pagamento, o pedido segue para preparação e envio.</p></div>
        <div className={s.card}><h2>Rastreamento</h2><p>O código é enviado ao e-mail da compra assim que estiver disponível.</p></div>
      </div>
      <p>A previsão exibida é uma estimativa calculada conforme o CEP e a modalidade escolhida. Eventos da transportadora podem atualizar o andamento durante o percurso.</p>
      <a className={s.button} href={RASTREIO_BASE} target="_blank" rel="noopener noreferrer">Rastrear meu pedido</a>
    </PaginaInstitucional>
  );
}
