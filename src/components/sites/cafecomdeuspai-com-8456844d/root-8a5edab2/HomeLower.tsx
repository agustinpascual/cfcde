"use client";

import { Check, X } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { FormEvent, useEffect, useRef, useState } from "react";
import { SiteFooter } from "../produtos-combo-plus-50ce9672/HeaderFooter";
import styles from "./HomeLower.module.css";

const HomeVideoStories = dynamic(() => import("./HomeVideoStories"), { ssr: false });

const cookieKey = "cdp-cookies-accepted";

export default function HomeLower() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [cookies, setCookies] = useState(true);
  const [carregarVideos, setCarregarVideos] = useState(false);
  const videosRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try { if (localStorage.getItem(cookieKey)) setCookies(false); } catch {}
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const alvo = videosRef.current;
    if (!alvo) return;
    const observer = new IntersectionObserver(([entrada]) => {
      if (!entrada.isIntersecting) return;
      setCarregarVideos(true);
      observer.disconnect();
    }, { rootMargin: "400px 0px" });
    observer.observe(alvo);
    return () => observer.disconnect();
  }, []);

  function acceptCookies() {
    try { localStorage.setItem(cookieKey, "1"); } catch {}
    setCookies(false);
  }

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

      <div ref={videosRef} className={styles.videoDeferred}>
        {carregarVideos ? <HomeVideoStories /> : (
          <section className={styles.videoPlaceholder} aria-labelledby="videos-placeholder-title">
            <h2 id="videos-placeholder-title">Descubra cada detalhe em vídeo</h2>
            <div aria-hidden><i /><i /><i /></div>
          </section>
        )}
      </div>

      <SiteFooter />

      {cookies ? (
        <div className={styles.cookie} role="dialog" aria-label="Aviso de cookies">
          <p>Utilizamos cookies para melhorar sua experiência. Ao continuar navegando, você concorda com a nossa <Link href="/politica-de-privacidade">Política de Privacidade</Link>.</p>
          <button className={styles.accept} type="button" onClick={acceptCookies}>Aceitar</button>
          <button className={styles.cookieClose} type="button" onClick={acceptCookies} aria-label="Fechar aviso"><X /></button>
        </div>
      ) : null}
    </>
  );
}
