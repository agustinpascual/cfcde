import type { Metadata } from "next";
import PaginaInstitucional from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/institucional/PaginaInstitucional";
import s from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/institucional/pagina.module.css";

export const metadata: Metadata = {
  title: "Sobre nós — Bela Blue Beauty",
  description: "Quem somos, nossa missão, visão e valores.",
};

const VALORES = [
  { titulo: "Missão", texto: "Entregar com excelência um resultado visível, transformador e satisfatório promovendo saúde física e mental, aliados ao bem estar e beleza." },
  { titulo: "Visão", texto: "Buscar o mais alto nível de crescimento e desenvolvimento a cada dia, estar entre as maiores e melhores empresas, sendo referência de emagrecimento saudável e estética no Brasil." },
  { titulo: "Valores", texto: "Respeito, integração e harmonização com ecossistema, associados a responsabilidade, ética e amor por aquilo que fazemos." },
];

export default function Page() {
  return (
    <PaginaInstitucional titulo="Sobre nós" subtitulo="Quem somos e o que nos move.">
      <h2>Quem somos nós</h2>
      <p>Loja de produtos para emagrecimento e beauty.</p>

      <div className={s.cards}>
        {VALORES.map((v) => (
          <div key={v.titulo} className={s.card}>
            <p className={s.cardTitulo}>{v.titulo}</p>
            <p>{v.texto}</p>
          </div>
        ))}
      </div>

      <div className={s.assinatura}>
        <p className={s.assinaturaMarca}>BELA BLUE BEAUTY®</p>
        <p className={s.assinaturaFrase}>O produto certo para a transformação que você precisa.</p>
      </div>
    </PaginaInstitucional>
  );
}
