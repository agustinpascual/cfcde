import type { Metadata } from "next";
import PaginaInstitucional from "@/components/sites/cafecomdeuspai-com-8456844d/institucional/PaginaInstitucional";
import s from "@/components/sites/cafecomdeuspai-com-8456844d/institucional/pagina.module.css";
import { metadadosPagina } from "@/lib/seo";

export const metadata: Metadata = metadadosPagina({
  titulo: "Assessoria de imprensa — Café com Deus Pai",
  descricao: "Canal para solicitações de imprensa relacionadas ao Café com Deus Pai.",
  caminho: "/assessoria-de-imprensa",
});

export default function Page() {
  return (
    <PaginaInstitucional titulo="Assessoria de imprensa" subtitulo="Canal para entrevistas, informações institucionais e solicitações de imprensa.">
      <h2>Envie sua solicitação</h2>
      <p>Inclua seu nome, veículo, pauta, prazo de retorno e uma forma de contato. A mensagem será encaminhada para avaliação da equipe responsável.</p>
      <a className={s.button} href="https://wa.me/5547920057518?text=Ol%C3%A1%2C%20tenho%20uma%20solicita%C3%A7%C3%A3o%20de%20imprensa%20sobre%20o%20Caf%C3%A9%20com%20Deus%20Pai." target="_blank" rel="noopener noreferrer">Falar com o atendimento</a>
    </PaginaInstitucional>
  );
}
