"use client";

import { useEffect, useRef, useState } from "react";

const CHAVE = "sf-cookies-ok";

export function CookieBar() {
  const [visivel, setVisivel] = useState(false);
  const barra = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CHAVE)) setVisivel(true);
    } catch {
      /* navegação privada / storage bloqueado: não insiste */
    }
  }, []);

  /* Publica a altura da barra para quem flutua no rodapé (botão de
     WhatsApp) subir junto e não ficar coberto. */
  useEffect(() => {
    const raiz = document.documentElement;
    if (!visivel) {
      raiz.style.removeProperty("--sf-cookie-h");
      return;
    }
    const altura = barra.current?.offsetHeight ?? 0;
    raiz.style.setProperty("--sf-cookie-h", `${altura}px`);
    return () => {
      raiz.style.removeProperty("--sf-cookie-h");
    };
  }, [visivel]);

  function aceitar() {
    try {
      localStorage.setItem(CHAVE, "1");
    } catch {}
    setVisivel(false);
  }

  if (!visivel) return null;

  return (
    <div
      ref={barra}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--sf-line)] bg-white/95 px-4 py-3 backdrop-blur"
    >
      <div className="mx-auto flex max-w-[var(--sf-container)] flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-center text-[12px] text-[var(--sf-ink-2)] sm:text-left">
          Ao navegar por este site você aceita o uso de cookies para agilizar a sua experiência de compra.
        </p>
        <button
          onClick={aceitar}
          className="shrink-0 rounded-[var(--sf-radius)] border border-[var(--sf-ink)] px-5 py-1.5 text-[12px] font-medium transition-colors hover:bg-[var(--sf-ink)] hover:text-white"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
