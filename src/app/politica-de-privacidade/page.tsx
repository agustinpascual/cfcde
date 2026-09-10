import type { Metadata } from "next";
import PaginaInstitucional from "@/components/sites/cafecomdeuspai-com-8456844d/institucional/PaginaInstitucional";
import s from "@/components/sites/cafecomdeuspai-com-8456844d/institucional/pagina.module.css";
import { metadadosPagina } from "@/lib/seo";

export const metadata: Metadata = metadadosPagina({
  titulo: "Política de privacidade — Café com Deus Pai",
  descricao: "Como a loja Café com Deus Pai trata e protege os dados usados na compra.",
  caminho: "/politica-de-privacidade",
});

export default function Page() {
  return (
    <PaginaInstitucional titulo="Política de privacidade" subtitulo="Como tratamos as informações necessárias para operar a loja e atender seu pedido.">
      <h2>Dados utilizados</h2>
      <p>Usamos as informações fornecidas durante a navegação e a compra para processar pedidos, confirmar pagamentos, realizar entregas, emitir documentos fiscais, prevenir fraudes e prestar atendimento.</p>
      <div className={s.highlight}><p>Os dados necessários ao pagamento são transmitidos ao provedor responsável pelo processamento. O site não inclui o número completo do cartão nos dados do pedido.</p></div>
      <h2>Segurança e funcionamento</h2>
      <p>Também podemos usar dados técnicos, como endereço IP, navegador e eventos de navegação, para segurança, funcionamento do site e medição de desempenho. O acesso é limitado às finalidades necessárias e aos prestadores envolvidos na operação da loja.</p>
      <h2>Fale com a gente</h2>
      <p>Para dúvidas sobre privacidade ou sobre os dados de um pedido, entre em contato com o SAC pelo número <strong>(47) 92005-7518</strong>.</p>
      <a className={s.button} href="https://wa.me/5547920057518" target="_blank" rel="noopener noreferrer">Falar com o atendimento</a>
    </PaginaInstitucional>
  );
}
