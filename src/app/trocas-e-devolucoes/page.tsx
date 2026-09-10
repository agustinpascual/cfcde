import type { Metadata } from "next";
import PaginaInstitucional from "@/components/sites/cafecomdeuspai-com-8456844d/institucional/PaginaInstitucional";
import s from "@/components/sites/cafecomdeuspai-com-8456844d/institucional/pagina.module.css";
import { metadadosPagina } from "@/lib/seo";

export const metadata: Metadata = metadadosPagina({
  titulo: "Trocas e devoluções — Café com Deus Pai",
  descricao: "Orientações para solicitar troca ou devolução de uma compra.",
  caminho: "/trocas-e-devolucoes",
});

export default function Page() {
  return (
    <PaginaInstitucional titulo="Trocas e devoluções" subtitulo="Saiba como pedir atendimento para um item recebido.">
      <h2>Como solicitar</h2>
      <p>Entre em contato com o SAC antes de enviar o produto. Informe o número do pedido, o e-mail usado na compra, o motivo da solicitação e, quando necessário, imagens do item e da embalagem.</p>
      <ul><li>Mantenha o produto, seus acessórios e a embalagem enquanto a solicitação é analisada.</li><li>Não envie nenhum item sem receber as instruções do atendimento.</li><li>As condições aplicáveis serão informadas conforme o produto e a situação do pedido, preservados os direitos do consumidor.</li></ul>
      <a className={s.button} href="https://wa.me/5547920057518?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20uma%20troca%20ou%20devolu%C3%A7%C3%A3o." target="_blank" rel="noopener noreferrer">Solicitar atendimento</a>
    </PaginaInstitucional>
  );
}
