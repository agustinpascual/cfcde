import type { Metadata } from "next";
import PaginaInstitucional from "@/components/sites/cafecomdeuspai-com-8456844d/institucional/PaginaInstitucional";
import s from "@/components/sites/cafecomdeuspai-com-8456844d/institucional/pagina.module.css";
import { metadadosPagina } from "@/lib/seo";

export const metadata: Metadata = metadadosPagina({
  titulo: "Compras em atacado — Café com Deus Pai",
  descricao: "Atendimento para compras em quantidade de produtos Café com Deus Pai.",
  caminho: "/compras-em-atacado",
});

export default function Page() {
  return (
    <PaginaInstitucional titulo="Compras em atacado" subtitulo="Consulte disponibilidade e condições para compras em quantidade.">
      <h2>Atendimento comercial</h2>
      <p>Informe os produtos, a quantidade desejada, a cidade de entrega e seus dados de contato. A equipe verificará disponibilidade e condições para a solicitação.</p>
      <div className={s.highlight}><p><strong>Importante:</strong> o envio da solicitação não reserva estoque nem confirma o pedido. A compra só é formalizada depois do retorno do atendimento.</p></div>
      <a className={s.button} href="https://wa.me/5547920057518?text=Ol%C3%A1%2C%20gostaria%20de%20informa%C3%A7%C3%B5es%20sobre%20compras%20em%20atacado." target="_blank" rel="noopener noreferrer">Consultar atendimento</a>
    </PaginaInstitucional>
  );
}
