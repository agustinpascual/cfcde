"use client";

import Image from "next/image";
import { Check, MessageCircle, Play, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { SiteFooter } from "../produtos-combo-plus-50ce9672/HeaderFooter";
import styles from "./HomeLower.module.css";

const assetRoot = "/sites/cafecomdeuspai-com-8456844d/root-8a5edab2";

const videos = [
  { src: "asset-005.webp", label: "Um café que transforma manhãs", position: "center" },
  { src: "asset-010.webp", label: "Conheça nossas edições", position: "center" },
  { src: "asset-011.webp", label: "Palavras para todos os dias", position: "center" },
  { src: "asset-016.webp", label: "Café com Deus Pai", position: "center" },
  { src: "asset-020.webp", label: "Feito para compartilhar", position: "center" },
];

export default function HomeLower() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [cookies, setCookies] = useState(true);

  function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Preencha seu nome e um e-mail válido.");
      setSent(false);
      return;
    }
    setError("");
    setSent(true);
    event.currentTarget.reset();
  }

  return (
    <>
      <section className={styles.newsletter} aria-labelledby="newsletter-title">
        <div className={styles.newsletterCopy}>
          <span className={styles.eyebrow}>FIQUE POR DENTRO</span>
          <h2 id="newsletter-title">Quer receber novidades?</h2>
          <p>Cadastre-se e seja a primeira pessoa a saber sobre lançamentos, ofertas e conteúdos especiais.</p>
        </div>
        <form className={styles.form} onSubmit={subscribe} noValidate>
          <label>
            <span>Nome</span>
            <input name="name" type="text" placeholder="Digite seu nome" autoComplete="name" />
          </label>
          <label>
            <span>E-mail</span>
            <input name="email" type="email" placeholder="Digite seu melhor e-mail" autoComplete="email" />
          </label>
          <button type="submit">Quero receber</button>
          <div className={styles.formMessage} aria-live="polite">
            {sent ? <span className={styles.success}><Check /> Cadastro realizado com sucesso!</span> : error}
          </div>
        </form>
      </section>

      <section className={styles.media} aria-labelledby="media-title">
        <h2 id="media-title">Descubra cada detalhe em vídeo</h2>
        <p>Inspire-se, conheça histórias e veja de perto tudo o que preparamos para você.</p>
        <div className={styles.videoScroller}>
          {videos.map((video, index) => (
            <button className={styles.videoCard} type="button" key={video.src} aria-label={`Reproduzir: ${video.label}`}>
              <Image src={`${assetRoot}/${video.src}`} alt="" fill sizes="(max-width: 768px) 72vw, 240px" style={{ objectPosition: video.position }} />
              <span className={styles.shade} />
              <span className={styles.play}><Play fill="currentColor" /></span>
              <strong>{video.label}</strong>
              <small>0{index + 1}</small>
            </button>
          ))}
        </div>
      </section>

      <SiteFooter />

      <a className={styles.whatsapp} href="https://wa.me/554732249292" target="_blank" rel="noreferrer" aria-label="Fale conosco pelo WhatsApp">
        <MessageCircle fill="currentColor" />
      </a>

      {cookies ? (
        <div className={styles.cookie} role="dialog" aria-label="Aviso de cookies">
          <p>Utilizamos cookies para melhorar sua experiência. Ao continuar navegando, você concorda com a nossa <a href="/politica-de-privacidade/">Política de Privacidade</a>.</p>
          <button className={styles.accept} type="button" onClick={() => setCookies(false)}>Aceitar</button>
          <button className={styles.cookieClose} type="button" onClick={() => setCookies(false)} aria-label="Fechar aviso"><X /></button>
        </div>
      ) : null}
    </>
  );
}
