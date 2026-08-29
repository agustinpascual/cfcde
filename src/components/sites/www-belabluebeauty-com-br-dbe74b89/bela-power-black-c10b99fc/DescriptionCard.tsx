"use client";
import { useState } from "react";
import { descricao as d } from "./data";
import { ChevronDown } from "./icons";
import s from "./styles.module.css";

function Accordion({ titulo, aberto, onToggle, children }: { titulo: string; aberto: boolean; onToggle: () => void; children?: React.ReactNode }) {
  return (
    <section>
      <h2 className={s.accordionTitulo} onClick={onToggle}>
        <button type="button" aria-expanded={aberto} style={{ all: "unset", cursor: "pointer", fontWeight: 700 }}>{titulo}</button>
        <ChevronDown width={18} height={18} className={`${s.accordionSeta} ${aberto ? s.accordionSetaAberta : ""}`} />
      </h2>
      {aberto && <div className={s.accordionCorpo}>{children}</div>}
    </section>
  );
}

export default function DescriptionCard() {
  const [descAberta, setDescAberta] = useState(true);
  const [espAberta, setEspAberta] = useState(false);

  return (
    <div className={s.infoDesc}>
      <Accordion titulo="Descrição" aberto={descAberta} onToggle={() => setDescAberta((v) => !v)}>
        <article className={s.descCard}>
          <header className={s.descHeader}>
            <div className={s.descBadge}>{d.badge}</div>
            <h2 className={s.descTitulo}>{d.tituloA} <span>{d.tituloB}</span></h2>
            <p className={s.descSub}>{d.subtitulo}</p>
            <div className={s.descRegua} />
          </header>

          <div className={s.descBody}>
            <div className={s.descIntro}>
              <div className={s.descLinha}>{d.linha}</div>
              <h3 className={s.descHeadline}>{d.headline}</h3>
              <p className={s.descTexto}>{d.intro.antes}<strong>{d.intro.forte}</strong>{d.intro.depois}</p>
            </div>

            <div className={s.descSpecs}>
              {d.specs.map((sp, i) => (
                <span key={sp} style={{ display: "contents" }}>
                  <span>{sp}</span>
                  {i < d.specs.length - 1 && <span aria-hidden>•</span>}
                </span>
              ))}
            </div>

            <div className={s.descCards}>
              {d.cards.map((c) => (
                <div key={c.n} className={s.descCardItem}>
                  <div className={s.descNum}>{c.n}</div>
                  <strong>{c.titulo}</strong>
                  <span>{c.texto}</span>
                </div>
              ))}
            </div>

            {d.blocos.map((b) => (
              <div key={b.titulo} className={s.descBloco}>
                <div className={s.descBlocoTitulo}>
                  <div className={s.descBlocoBarra} />
                  <h3>{b.titulo}</h3>
                </div>
                <p>{b.texto}</p>
              </div>
            ))}

            <div className={s.descAviso}>
              <strong>{d.aviso.titulo}</strong>
              <p>{d.aviso.texto}</p>
            </div>
          </div>
        </article>
      </Accordion>

      <Accordion titulo="Especificações" aberto={espAberta} onToggle={() => setEspAberta((v) => !v)}>
        <p style={{ fontSize: 13, lineHeight: "19.5px" }}>&nbsp;</p>
      </Accordion>
    </div>
  );
}
