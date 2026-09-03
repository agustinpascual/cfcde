"use client";

import Link from "next/link";
import { Heart, MessageCircle, Share2, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./HomeVideoStories.module.css";

const root = "/sites/cafecomdeuspai-com-8456844d/root-8a5edab2/videos";
/* Os sete vídeos da vitrine, na ordem do site original (iShorts). O poster
   é o primeiro frame: os cards laterais não ficam preto enquanto carregam. */
const videos = [1, 2, 3, 4, 5, 6, 7].map((number) => ({
  src: `${root}/video-${number}.mp4`,
  poster: `${root}/video-${number}.jpg`,
}));

const wrap = (index: number) => (index + videos.length) % videos.length;

export default function HomeVideoStories() {
  const [center, setCenter] = useState(0);
  const [story, setStory] = useState<number | null>(null);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [progress, setProgress] = useState(0);
  const storyVideo = useRef<HTMLVideoElement>(null);
  const cardVideos = useRef(new Map<number, HTMLVideoElement>());
  const visible = [-2, -1, 0, 1, 2].map((offset) => ({ index: wrap(center + offset), offset }));

  function close() { setStory(null); setProgress(0); }
  function move(direction: number) {
    setStory((current) => current === null ? current : wrap(current + direction));
    setProgress(0);
  }
  function open(index: number) { setStory(index); setMuted(true); setProgress(0); }
  /* O vídeo do meio toca uma vez e o carrossel anda sozinho. Com o story
     aberto ele espera, senão o fundo trocaria de vídeo por baixo do modal. */
  function avancar() { if (story === null) setCenter((atual) => wrap(atual + 1)); }

  /* Os cards têm key fixa por vídeo, então trocar o centro reordena os
     elementos em vez de remontá-los — o que já foi baixado continua na mão.
     Em troca, o autoPlay não dispara de novo e quem toca é este efeito. */
  useEffect(() => {
    cardVideos.current.forEach((video, index) => {
      if (index !== center) { video.pause(); return; }
      /* Antes dos metadados o currentTime ainda não aceita escrita. */
      if (video.readyState > 0) video.currentTime = 0;
      video.play().catch(() => undefined);
    });
  }, [center]);

  useEffect(() => {
    if (story === null) return;
    const overflow = document.body.style.overflow;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("keydown", keydown); };
  }, [story]);

  async function share() {
    const data = { title: "Café com Deus Pai", text: "Conheça o Café com Deus Pai", url: window.location.href };
    if (navigator.share) await navigator.share(data).catch(() => undefined);
    else await navigator.clipboard?.writeText(window.location.href);
  }

  return <section className={styles.section} aria-labelledby="stories-title">
    <div className={styles.inner}>
      <h2 id="stories-title">Descubra cada detalhe em vídeo</h2>
      <div className={styles.carousel}>
        {visible.map(({ index, offset }) => <button key={index} className={`${styles.card} ${offset === 0 ? styles.central : ""} ${Math.abs(offset) === 2 ? styles.edge : ""}`} type="button" onClick={() => open(index)} aria-label={`Abrir vídeo ${index + 1}`}>
          <video
            ref={(element) => {
              if (element) cardVideos.current.set(index, element);
              else cardVideos.current.delete(index);
            }}
            src={videos[index].src}
            poster={videos[index].poster}
            muted
            playsInline
            autoPlay={offset === 0}
            preload={offset >= 0 && offset <= 1 ? "auto" : "metadata"}
            onEnded={offset === 0 ? avancar : undefined}
          />
          <span className={styles.play} aria-hidden="true">▶</span>
        </button>)}
      </div>
    </div>

    {/* Portal no body: o ScrollReveal deixa "will-change: transform" nas
        seções, e isso prende qualquer position:fixed dentro da seção. */}
    {story !== null && createPortal(<div className={styles.modal} role="dialog" aria-modal="true" aria-label={`Story ${story + 1} de ${videos.length}`}>
      <div className={styles.story}>
        <div className={styles.stage}>
          <video key={story} ref={storyVideo} src={videos[story].src} poster={videos[story].poster} muted={muted} autoPlay playsInline onEnded={() => move(1)} onTimeUpdate={(event) => { const video = event.currentTarget; setProgress(video.duration ? video.currentTime / video.duration : 0); }} />
          <div className={styles.progress} style={{ gridTemplateColumns: `repeat(${videos.length}, 1fr)` }}>{videos.map((_, index) => <i key={index}><b style={{ width: index < story ? "100%" : index === story ? `${progress * 100}%` : "0%" }} /></i>)}</div>
          <button className={styles.sound} type="button" onClick={() => setMuted((value) => !value)} aria-label={muted ? "Ativar som" : "Desativar som"}>{muted ? <VolumeX /> : <Volume2 />}</button>
          <button className={styles.close} type="button" onClick={close} aria-label="Fechar"><X /></button>
          <div className={styles.actions}>
            <button type="button" className={liked ? styles.liked : ""} onClick={() => setLiked((value) => !value)} aria-label="Curtir"><Heart fill={liked ? "currentColor" : "none"} /></button>
            <a href={`https://wa.me/?text=${encodeURIComponent("Conheça o Café com Deus Pai: ")}`} target="_blank" rel="noreferrer" aria-label="Compartilhar no WhatsApp"><MessageCircle /></a>
            <button type="button" onClick={share} aria-label="Compartilhar"><Share2 /></button>
          </div>
          <Link className={styles.cta} href="/produtos/combo-plus/">Saiba mais</Link>
        </div>
        {/* As metades cobrem a tela inteira, não só o vídeo: clicou na direita
            passa, na esquerda volta. Fecha pelo X ou pelo Esc. */}
        <button className={`${styles.zone} ${styles.left}`} type="button" onClick={() => move(-1)} aria-label="Story anterior" />
        <button className={`${styles.zone} ${styles.right}`} type="button" onClick={() => move(1)} aria-label="Próximo story" />
      </div>
    </div>, document.body)}
  </section>;
}
