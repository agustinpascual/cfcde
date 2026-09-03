"use client";

import { Check, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { SiteFooter } from "../produtos-combo-plus-50ce9672/HeaderFooter";
import HomeVideoStories from "./HomeVideoStories";
import styles from "./HomeLower.module.css";

const cookieKey = "cdp-cookies-accepted";

/* Glifo oficial do WhatsApp (traçado do Simple Icons, CC0) — o desenho
   anterior tinha proporções próprias e ficava apertado dentro do botão. */
function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.57-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413"
      />
    </svg>
  );
}

export default function HomeLower() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [cookies, setCookies] = useState(true);

  useEffect(() => {
    try { if (localStorage.getItem(cookieKey)) setCookies(false); } catch {}
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

      <HomeVideoStories />

      <SiteFooter />

      {!cookies ? <a className={styles.whatsapp} href="https://wa.me/554732249292" target="_blank" rel="noreferrer" aria-label="Fale conosco pelo WhatsApp">
        <WhatsAppIcon />
        <span>Fale conosco</span>
      </a> : null}

      {cookies ? (
        <div className={styles.cookie} role="dialog" aria-label="Aviso de cookies">
          <p>Utilizamos cookies para melhorar sua experiência. Ao continuar navegando, você concorda com a nossa <a href="/politica-de-privacidade/">Política de Privacidade</a>.</p>
          <button className={styles.accept} type="button" onClick={acceptCookies}>Aceitar</button>
          <button className={styles.cookieClose} type="button" onClick={acceptCookies} aria-label="Fechar aviso"><X /></button>
        </div>
      ) : null}
    </>
  );
}
