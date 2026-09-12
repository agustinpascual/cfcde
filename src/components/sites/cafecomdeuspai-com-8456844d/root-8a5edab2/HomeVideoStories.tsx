"use client";

import Link from "next/link";
import { Heart, MessageCircle, Share2, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import styles from "./HomeVideoStories.module.css";

const root = "/sites/cafecomdeuspai-com-8456844d/root-8a5edab2/videos";
const mediaVersion = "20260912-otimizados";
const launcherPreview = `${root}/launcher-preview.m4v?v=${mediaVersion}`;
/* Os sete vídeos da vitrine, na ordem do site original (iShorts). O poster
   é o primeiro frame: os cards laterais não ficam preto enquanto carregam. */
const videos = [1, 2, 3, 4, 5, 6, 7].map((number) => ({
  src: `${root}/video-${number}.mp4?v=${mediaVersion}`,
  poster: `${root}/video-${number}.webp?v=${mediaVersion}`,
}));

const wrap = (index: number) => (index + videos.length) % videos.length;
const POSICAO_LAUNCHER = "cdp-story-launcher-position";
const MARGEM_LAUNCHER = 8;

type PosicaoLauncher = { x: number; y: number };
type ArrasteLauncher = PosicaoLauncher & { pointerId: number; inicioX: number; inicioY: number; moveu: boolean };

function limitarPosicao(x: number, y: number, elemento: HTMLElement): PosicaoLauncher {
  const maxX = Math.max(MARGEM_LAUNCHER, window.innerWidth - elemento.offsetWidth - MARGEM_LAUNCHER);
  const maxY = Math.max(MARGEM_LAUNCHER, window.innerHeight - elemento.offsetHeight - MARGEM_LAUNCHER);
  return {
    x: Math.min(Math.max(MARGEM_LAUNCHER, x), maxX),
    y: Math.min(Math.max(MARGEM_LAUNCHER, y), maxY),
  };
}

export default function HomeVideoStories({ floating = false }: { floating?: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [center, setCenter] = useState(0);
  const [story, setStory] = useState<number | null>(null);
  const [mediaAtiva, setMediaAtiva] = useState(floating);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pageScrolled, setPageScrolled] = useState(false);
  const [launcherPosition, setLauncherPosition] = useState<PosicaoLauncher | null>(null);
  const [launcherDragging, setLauncherDragging] = useState(false);
  const launcherVideo = useRef<HTMLVideoElement>(null);
  const launcherButton = useRef<HTMLButtonElement>(null);
  const launcherDrag = useRef<ArrasteLauncher | null>(null);
  const ignorarCliqueAte = useRef(0);
  const storyVideo = useRef<HTMLVideoElement>(null);
  const cardVideos = useRef(new Map<number, HTMLVideoElement>());
  const visible = [-2, -1, 0, 1, 2].map((offset) => ({ index: wrap(center + offset), offset }));

  useEffect(() => {
    if (floating) return;
    const section = sectionRef.current;
    if (!section) return;

    if (!("IntersectionObserver" in window)) {
      const timer = setTimeout(() => setMediaAtiva(true), 0);
      return () => clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setMediaAtiva(true);
        observer.disconnect();
      },
      { rootMargin: "120px 0px", threshold: 0.01 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [floating]);

  useEffect(() => {
    if (!floating) return;
    const atualizar = () => setPageScrolled(window.scrollY > 80);
    const reproduzir = () => launcherVideo.current?.play().catch(() => undefined);
    atualizar();
    reproduzir();
    window.addEventListener("scroll", atualizar, { passive: true });
    document.addEventListener("visibilitychange", reproduzir);
    return () => {
      window.removeEventListener("scroll", atualizar);
      document.removeEventListener("visibilitychange", reproduzir);
    };
  }, [floating]);

  useEffect(() => {
    if (!floating) return;
    const restaurar = () => {
      try {
        const salva = JSON.parse(localStorage.getItem(POSICAO_LAUNCHER) ?? "null") as Partial<PosicaoLauncher> | null;
        const elemento = launcherButton.current;
        if (elemento && Number.isFinite(salva?.x) && Number.isFinite(salva?.y)) {
          setLauncherPosition(limitarPosicao(Number(salva?.x), Number(salva?.y), elemento));
        }
      } catch { /* Preferências bloqueadas não impedem o vídeo nem o arraste. */ }
    };
    const ajustar = () => {
      const elemento = launcherButton.current;
      if (!elemento) return;
      setLauncherPosition((atual) => atual ? limitarPosicao(atual.x, atual.y, elemento) : atual);
    };
    restaurar();
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
  }, [floating]);

  function close() { setStory(null); setProgress(0); }
  function move(direction: number) {
    setStory((current) => current === null ? current : wrap(current + direction));
    setProgress(0);
  }
  function open(index: number) { setStory(index); setMuted(true); setProgress(0); }
  function iniciarArraste(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    launcherDrag.current = {
      pointerId: event.pointerId,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      inicioX: event.clientX,
      inicioY: event.clientY,
      moveu: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moverLauncher(event: ReactPointerEvent<HTMLButtonElement>) {
    const arraste = launcherDrag.current;
    if (!arraste || arraste.pointerId !== event.pointerId) return;
    if (!arraste.moveu && Math.hypot(event.clientX - arraste.inicioX, event.clientY - arraste.inicioY) < 6) return;
    arraste.moveu = true;
    setLauncherDragging(true);
    setLauncherPosition(limitarPosicao(event.clientX - arraste.x, event.clientY - arraste.y, event.currentTarget));
  }
  function terminarArraste(event: ReactPointerEvent<HTMLButtonElement>) {
    const arraste = launcherDrag.current;
    if (!arraste || arraste.pointerId !== event.pointerId) return;
    launcherDrag.current = null;
    setLauncherDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!arraste.moveu) return;
    ignorarCliqueAte.current = performance.now() + 350;
    setLauncherPosition((atual) => {
      if (atual) {
        try { localStorage.setItem(POSICAO_LAUNCHER, JSON.stringify(atual)); } catch {}
      }
      return atual;
    });
  }
  function clicarLauncher() {
    if (performance.now() < ignorarCliqueAte.current) return;
    open(0);
  }
  /* O vídeo do meio toca uma vez e o carrossel anda sozinho. Com o story
     aberto ele espera, senão o fundo trocaria de vídeo por baixo do modal. */
  function avancar() { if (story === null) setCenter((atual) => wrap(atual + 1)); }

  /* Os cards têm key fixa por vídeo, então trocar o centro reordena os
     elementos em vez de remontá-los — o que já foi baixado continua na mão.
     Em troca, o autoPlay não dispara de novo e quem toca é este efeito. */
  useEffect(() => {
    if (!mediaAtiva) return;

    cardVideos.current.forEach((video, index) => {
      if (index !== center) { video.pause(); return; }
      /* Antes dos metadados o currentTime ainda não aceita escrita. */
      if (video.readyState > 0) video.currentTime = 0;
      video.play().catch(() => undefined);
    });
  }, [center, mediaAtiva]);

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

  const launcherStyle = launcherPosition ? ({ position: "fixed", left: launcherPosition.x, top: launcherPosition.y, right: "auto", bottom: "auto" } satisfies CSSProperties) : undefined;
  const launcher = floating ? (
    <button ref={launcherButton} className={`${styles.launcher} ${pageScrolled ? styles.launcherFollowing : ""} ${launcherDragging ? styles.launcherDragging : ""}`} style={launcherStyle} type="button" onClick={clicarLauncher} onPointerDown={iniciarArraste} onPointerMove={moverLauncher} onPointerUp={terminarArraste} onPointerCancel={terminarArraste} aria-label="Abrir stories em vídeo. Mantenha pressionado e arraste para mover">
      <span className={styles.launcherMedia}>
        <video ref={launcherVideo} src={launcherPreview} poster={videos[0].poster} muted autoPlay loop playsInline preload="metadata" draggable={false} onCanPlay={(event) => event.currentTarget.play().catch(() => undefined)} aria-hidden="true" />
        <span className={styles.launcherShade} aria-hidden="true" />
      </span>
    </button>
  ) : (
    <section ref={sectionRef} className={styles.section} aria-labelledby="stories-title">
      <div className={styles.inner}>
        <h2 id="stories-title">Descubra cada detalhe em vídeo</h2>
        <div className={styles.carousel}>
          {visible.map(({ index, offset }) => <button key={index} className={`${styles.card} ${offset === 0 ? styles.central : ""} ${Math.abs(offset) === 2 ? styles.edge : ""}`} type="button" onClick={() => open(index)} aria-label={`Abrir vídeo ${index + 1}`}>
            <video
              ref={(element) => {
                if (element) cardVideos.current.set(index, element);
                else cardVideos.current.delete(index);
              }}
              /* A mídia só é conectada quando a seção se aproxima da tela.
                 Isso evita baixar vários megabytes de vídeo durante a abertura
                 da home, sem atrasar a reprodução quando o visitante chegar. */
              src={mediaAtiva && offset === 0 ? videos[index].src : undefined}
              poster={mediaAtiva ? videos[index].poster : undefined}
              muted
              playsInline
              autoPlay={mediaAtiva && offset === 0}
              preload={mediaAtiva && offset === 0 ? "metadata" : "none"}
              onEnded={offset === 0 ? avancar : undefined}
            />
          </button>)}
        </div>
      </div>
    </section>
  );

  return <>{launcher}
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
          <Link className={styles.cta} href="/produto/box-plus2027">Saiba mais</Link>
        </div>
        {/* As metades cobrem a tela inteira, não só o vídeo: clicou na direita
            passa, na esquerda volta. Fecha pelo X ou pelo Esc. */}
        <button className={`${styles.zone} ${styles.left}`} type="button" onClick={() => move(-1)} aria-label="Story anterior" />
        <button className={`${styles.zone} ${styles.right}`} type="button" onClick={() => move(1)} aria-label="Próximo story" />
      </div>
    </div>, document.body)}
  </>;
}
