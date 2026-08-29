"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { criadores, criadoresTexto } from "./data";
import s from "./styles.module.css";

/* Vitrine de criadores de conteúdo.
   Vídeo local reproduz inline (só um por vez); embed abre num iframe.
   Se a lista estiver vazia, a seção some — nada de espaço em branco. */
export default function CreatorsSection() {
  const [tocando, setTocando] = useState<number | null>(null);
  const trilho = useRef<HTMLDivElement>(null);

  if (criadores.length === 0) return null;

  const rolar = (dir: number) =>
    trilho.current?.scrollBy({ left: dir * 300, behavior: "smooth" });

  return (
    <section className={s.criadores} aria-labelledby="criadores-titulo">
      <div className={s.criadoresCabecalho}>
        <div>
          <p className={s.criadoresSelo}>{criadoresTexto.selo}</p>
          <h2 id="criadores-titulo" className={s.criadoresTitulo}>{criadoresTexto.titulo}</h2>
          <p className={s.criadoresSub}>{criadoresTexto.subtitulo}</p>
        </div>
        {criadores.length > 2 && (
          <div className={s.criadoresNav}>
            <button className={s.criadoresBtn} aria-label="Anterior" onClick={() => rolar(-1)}>‹</button>
            <button className={s.criadoresBtn} aria-label="Próximo" onClick={() => rolar(1)}>›</button>
          </div>
        )}
      </div>

      <div className={s.criadoresTrilho} ref={trilho}>
        {criadores.map((c, i) => (
          <article key={c.arroba + i} className={s.criadorCard}>
            <div className={s.criadorVideo}>
              {c.embed ? (
                <iframe
                  className={s.criadorFrame}
                  src={c.embed}
                  title={`Vídeo de ${c.nome}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              ) : tocando === i ? (
                <video className={s.criadorPlayer} src={c.src} poster={c.poster}
                  controls autoPlay playsInline onEnded={() => setTocando(null)} />
              ) : (
                <button className={s.criadorCapa} onClick={() => setTocando(i)}
                  aria-label={`Assistir ao vídeo de ${c.nome}`}>
                  {c.poster && (
                    <Image src={c.poster} alt="" fill sizes="(max-width: 767px) 60vw, 260px"
                      style={{ objectFit: "cover" }} loading="lazy" />
                  )}
                  <span className={s.criadorPlay} aria-hidden>
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg>
                  </span>
                </button>
              )}
            </div>

            <div className={s.criadorInfo}>
              <p className={s.criadorNome}>{c.nome}</p>
              <p className={s.criadorArroba}>
                {c.arroba}{c.seguidores && <span className={s.criadorSeguidores}> · {c.seguidores}</span>}
              </p>
              <p className={s.criadorLegenda}>{c.legenda}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
