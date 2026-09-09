"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import s from "./menu-mobile.module.css";

export default function MenuMobile({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [aberto, setAberto] = useState(false);

  function fechar() {
    dialog.current?.close();
    setAberto(false);
  }

  useEffect(() => {
    if (!aberto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const media = window.matchMedia("(min-width: 861px)");
    const aoRedimensionar = () => {
      if (media.matches) { dialog.current?.close(); setAberto(false); }
    };
    media.addEventListener("change", aoRedimensionar);
    return () => {
      document.body.style.overflow = anterior;
      media.removeEventListener("change", aoRedimensionar);
    };
  }, [aberto]);

  return (
    <>
      <div className={s.desktop}>{children}</div>
      <div className={s.barra}>
        <button type="button" className={s.botao} aria-label="Abrir menu" aria-expanded={aberto}
          aria-controls="menu-painel-mobile" onClick={() => { dialog.current?.showModal(); setAberto(true); }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Menu
        </button>
        <span>Painel administrativo</span>
      </div>
      <dialog ref={dialog} id="menu-painel-mobile" className={s.dialog} aria-label="Menu do painel"
        onClose={() => setAberto(false)} onClick={(event) => {
          if (event.target === event.currentTarget || (event.target as HTMLElement).closest("a")) fechar();
        }}>
        <div className={s.gaveta}>
          <button type="button" className={`${s.botao} ${s.fechar}`} onClick={fechar} aria-label="Fechar menu">
            <span aria-hidden="true">×</span> Fechar
          </button>
          {children}
        </div>
      </dialog>
    </>
  );
}
