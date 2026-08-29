"use client";
import Image from "next/image";
import { useMemo, useState } from "react";
import { resumoAvaliacoes, reviews } from "./data";
import { Stars } from "./icons";
import s from "./styles.module.css";

/* Todas as avaliações aqui são REAIS — extraídas do carrossel
   .native-reviews-product do site de origem. O que muda entre as abas é
   apenas a ORDEM em que elas aparecem, nunca o conteúdo. */

const CORES = ["#0b2860", "#12336e", "#1e4081", "#3a5a9b", "#25406f", "#16305e"];
const corDoNome = (nome: string) =>
  CORES[[...nome].reduce((a, c) => a + c.charCodeAt(0), 0) % CORES.length];

/* Relevância: quem descreve resultado concreto, manda foto ou escreve mais
   costuma ser a avaliação mais útil para quem está decidindo. */
function relevancia(r: (typeof reviews)[number]) {
  const t = r.texto.toLowerCase();
  let n = 0;
  if (/\d+([.,]\d+)?\s*(kg|kilo|quilo)/.test(t)) n += 4;
  if (r.foto) n += 3;
  if (/\d+\s*dias?|primeira semana|semana/.test(t)) n += 2;
  if (/recomendo|maravilhos|incrív|superou|top/.test(t)) n += 1;
  if (r.texto.length > 90) n += 1;
  return n;
}

const paraData = (d: string) => {
  const [dia, mes, ano] = d.split("/").map(Number);
  return new Date(ano, mes - 1, dia).getTime();
};

const ABAS = [
  { id: "relevantes", rotulo: "Mais relevantes" },
  { id: "recentes", rotulo: "Mais recentes" },
  { id: "fotos", rotulo: "Com foto" },
] as const;

const PASSO = 6;

export default function ReviewsSection() {
  const [aba, setAba] = useState<(typeof ABAS)[number]["id"]>("relevantes");
  const [visiveis, setVisiveis] = useState(PASSO);

  const comFoto = reviews.filter((r) => r.foto).length;

  const ordenadas = useMemo(() => {
    const l = [...reviews];
    if (aba === "recentes") return l.sort((a, b) => paraData(b.data) - paraData(a.data));
    if (aba === "fotos") return l.filter((r) => r.foto);
    return l.sort((a, b) => relevancia(b) - relevancia(a) || paraData(b.data) - paraData(a.data));
  }, [aba]);

  /* três melhores avaliações reais em destaque, acima da grade */
  const destaques = useMemo(
    () => [...reviews].sort((a, b) => relevancia(b) - relevancia(a)).slice(0, 3),
    []
  );

  const mostradas = ordenadas.slice(0, visiveis);
  const restantes = ordenadas.length - visiveis;

  const trocarAba = (id: typeof aba) => { setAba(id); setVisiveis(PASSO); };

  return (
    <section className={s.reviews} id="avaliacoes">
      <h2 className={s.reviewsTitulo}>Avaliações</h2>

      {/* ---- resumo ---- */}
      <div className={s.reviewsResumo}>
        <div className={s.resumoNota}>
          <span className={s.resumoNotaNumero}>{resumoAvaliacoes.media.toFixed(1).replace(".", ",")}</span>
          <Stars nota={resumoAvaliacoes.media} size={18} />
          <span className={s.resumoNotaTotal}>{resumoAvaliacoes.total} avaliações</span>
        </div>

        <div className={s.resumoBarras}>
          {[5, 4, 3, 2, 1].map((n) => {
            const qtd = resumoAvaliacoes.distribuicao[n] ?? 0;
            const pct = resumoAvaliacoes.total ? (qtd / resumoAvaliacoes.total) * 100 : 0;
            return (
              <div key={n} className={s.resumoBarraLinha}>
                <span className={s.resumoBarraLabel}>{n}★</span>
                <span className={s.resumoBarraTrilho}><span className={s.resumoBarraFill} style={{ width: `${pct}%` }} /></span>
                <span className={s.resumoBarraQtd}>{qtd}</span>
              </div>
            );
          })}
        </div>

        <div className={s.resumoAcoes}>
          <p className={s.resumoSelo}>✓ 100% de compras verificadas</p>
          <button className={s.btAvaliar}>✎ AVALIAR PRODUTO</button>
        </div>
      </div>

      {/* ---- destaques ---- */}
      <div className={s.destaques}>
        <p className={s.destaquesTitulo}>Em destaque</p>
        <div className={s.destaquesLista}>
          {destaques.map((r, i) => (
            <blockquote key={`d-${i}`} className={s.destaque}>
              <Stars nota={r.estrelas} size={13} />
              <p className={s.destaqueTexto}>&ldquo;{r.texto}&rdquo;</p>
              <footer className={s.destaqueAutor}>
                <span className={s.reviewAvatar} style={{ background: corDoNome(r.autor) }} aria-hidden>
                  {r.autor.trim().charAt(0).toUpperCase()}
                </span>
                <span>{r.autor}<span className={s.destaqueData}> · {r.data}</span></span>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>

      {/* ---- abas ---- */}
      <div className={s.reviewsFiltros} role="tablist" aria-label="Ordenar avaliações">
        {ABAS.map((t) => (
          <button key={t.id} role="tab" aria-selected={aba === t.id}
            className={`${s.filtro} ${aba === t.id ? s.filtroAtivo : ""}`}
            onClick={() => trocarAba(t.id)}>
            {t.rotulo}{t.id === "fotos" ? ` (${comFoto})` : ""}
          </button>
        ))}
      </div>

      {/* ---- grade ---- */}
      <div className={s.reviewsGrade}>
        {mostradas.map((r, i) => (
          <article key={`${r.autor}-${r.data}-${i}`} className={s.reviewCard}>
            <header className={s.reviewCabecalho}>
              <span className={s.reviewAvatar} style={{ background: corDoNome(r.autor) }} aria-hidden>
                {r.autor.trim().charAt(0).toUpperCase()}
              </span>
              <span className={s.reviewMeta}>
                <span className={s.reviewAutor}>{r.autor}</span>
                <span className={s.reviewData}>{r.data}</span>
              </span>
              <span className={s.reviewVerificada} title="Compra verificada">✓</span>
            </header>

            <Stars nota={r.estrelas} size={14} />
            <p className={s.reviewTexto}>{r.texto}</p>

            {r.foto && (
              <Image className={s.reviewFoto} src={r.foto} alt={`Foto enviada por ${r.autor}`}
                width={96} height={208} sizes="96px" loading="lazy" />
            )}
          </article>
        ))}
      </div>

      {restantes > 0 && (
        <div className={s.reviewsMaisWrap}>
          <button className={s.btMais} onClick={() => setVisiveis((v) => v + PASSO)}>
            Ver mais {Math.min(restantes, PASSO)} de {restantes} avaliações
          </button>
        </div>
      )}
    </section>
  );
}
