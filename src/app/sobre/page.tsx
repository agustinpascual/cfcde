import type { Metadata } from "next";
import PaginaInstitucional from "@/components/sites/cafecomdeuspai-com-8456844d/institucional/PaginaInstitucional";
import s from "@/components/sites/cafecomdeuspai-com-8456844d/institucional/pagina.module.css";
import { metadadosPagina } from "@/lib/seo";

export const metadata: Metadata = metadadosPagina({
  titulo: "Sobre nós — Café com Deus Pai",
  descricao: "Conheça a loja oficial Café com Deus Pai e o propósito de nossos produtos.",
  caminho: "/sobre",
});

export default function Page() {
  return (
    <PaginaInstitucional titulo="Sobre nós" subtitulo="Produtos que acompanham momentos de fé, reflexão e conexão com Deus Pai.">
      <h2>Nossa história</h2>
      <p>Café com Deus Pai nasceu como um convite para transformar a rotina em um encontro diário com Deus. A loja oficial reúne devocionais, livros de oração, canecas, cafés e presentes ligados a essa experiência.</p>
      <div className={s.cards}>
        <div className={s.card}><h2>Propósito</h2><p>Ajudar cada pessoa a reservar um momento do dia para leitura, oração e reflexão.</p></div>
        <div className={s.card}><h2>Cuidado</h2><p>Selecionar produtos com identidade, acabamento cuidadoso e informações claras.</p></div>
        <div className={s.card}><h2>Comunidade</h2><p>Compartilhar uma jornada de fé que já faz parte da rotina de muitas famílias.</p></div>
      </div>
    </PaginaInstitucional>
  );
}
