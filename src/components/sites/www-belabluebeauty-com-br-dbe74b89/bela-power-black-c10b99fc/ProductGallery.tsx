"use client";
import Image from "next/image";
import { useState } from "react";
import { produto } from "./data";
import { ArrowLeft, ArrowRight } from "./icons";
import s from "./styles.module.css";

/* .fotos — .mini (100px) à esquerda + .big (712x712) à direita
   A tarja "TOP ENTRE OS PRODUTOS MAIS VENDIDOS" faz parte da própria imagem
   no site original (não existe elemento no DOM) — por isso não é renderizada aqui. */
export default function ProductGallery() {
  const [ativo, setAtivo] = useState(0);
  const fotos = produto.galeria;
  const go = (d: number) => setAtivo((v) => (v + d + fotos.length) % fotos.length);

  return (
    <div className={s.galeria}>
      <div className={s.galeriaFotos}>
        <div className={s.minis}>
          {fotos.map((f, i) => (
            <button key={i} onClick={() => setAtivo(i)} aria-label={`Ver foto ${i + 1}`} aria-current={i === ativo}
              className={`${s.mini} ${i === ativo ? s.miniAtiva : ""}`}>
              <Image src={f.thumb} alt="" width={98} height={Math.round(98 / f.ratio)} sizes="98px" />
            </button>
          ))}
        </div>

        <div className={s.big}>
          <div className={s.bigFrame}>
            <Image
              src={fotos[ativo].full}
              alt={produto.nome}
              width={712}
              height={712}
              priority={ativo === 0}
              sizes="(max-width: 1279px) 100vw, 712px"
              quality={82}
            />
          </div>

          <ul className={s.dots}>
            {fotos.map((_, i) => (
              <li key={i}>
                <button onClick={() => setAtivo(i)} aria-label={`Ir para foto ${i + 1}`} className={`${s.dot} ${i === ativo ? s.dotAtivo : ""}`} />
              </li>
            ))}
          </ul>
        </div>

        {ativo > 0 && (
          <span onClick={() => go(-1)} role="button" tabIndex={0} aria-label="Foto anterior" className={`${s.seta} ${s.setaPrev}`}><ArrowLeft /></span>
        )}
        {ativo < fotos.length - 1 && (
          <span onClick={() => go(1)} role="button" tabIndex={0} aria-label="Próxima foto" className={`${s.seta} ${s.setaNext}`}><ArrowRight /></span>
        )}
      </div>
    </div>
  );
}
