import type { Metadata } from "next";
import Link from "next/link";
import PaginaInstitucional from "@/components/sites/cafecomdeuspai-com-8456844d/institucional/PaginaInstitucional";
import s from "@/components/sites/cafecomdeuspai-com-8456844d/institucional/pagina.module.css";
import { metadadosPagina } from "@/lib/seo";

export const metadata: Metadata = metadadosPagina({
  titulo: "Sobre o autor — Café com Deus Pai",
  descricao: "Conheça Junior Rostirola, autor de Café com Deus Pai.",
  caminho: "/sobre-o-autor",
});

export default function Page() {
  return (
    <PaginaInstitucional titulo="Sobre o autor" subtitulo="Junior Rostirola, autor da série Café com Deus Pai.">
      <h2>Junior Rostirola</h2>
      <p>Junior Rostirola é o autor de Café com Deus Pai, uma série de devocionais com mensagens para acompanhar cada dia do ano e incentivar momentos de fé, oração e reflexão.</p>
      <p>Na loja você encontra diferentes edições da obra e produtos criados para acompanhar essa experiência diária.</p>
      <Link className={s.button} href="/categoria/lancamento">Conhecer os lançamentos</Link>
    </PaginaInstitucional>
  );
}
