"use client";

import { useEffect } from "react";

/* Trava de domínio: uma cópia rehospedada roda este script em outro host e é
   mandada embora em vez de exibir a loja.

   Limite honesto: isto é JavaScript no cliente. Serve contra a cópia
   preguiçosa ("salvar página como" e subir em outro lugar) — quem copiar com
   atenção apaga o script. O que é realmente inviolável está nos headers do
   next.config.ts: frame-ancestors 'none' e X-Frame-Options DENY impedem que
   o site seja embutido num iframe de terceiro. */

const DESTINO = "https://www.google.com";

function atalhoDeInspecao(evento: KeyboardEvent) {
  const tecla = evento.key.toLowerCase();
  const modificador = evento.ctrlKey || evento.metaKey;

  return evento.key === "F12"
    || (modificador && evento.shiftKey && ["i", "j", "c"].includes(tecla))
    || (modificador && tecla === "u")
    || (evento.metaKey && evento.altKey && ["i", "j", "c"].includes(tecla));
}

function campoEditavel(alvo: EventTarget | null) {
  return alvo instanceof HTMLElement
    && (alvo.matches("input, textarea, select") || alvo.isContentEditable);
}

/* Dimensões da janela e pausas de execução não identificam DevTools com
   segurança. Não redirecionamos visitantes com base nessas heurísticas nem
   avaliamos código dinâmico, proibido pela CSP de produção. */
function navegadorDeToque() {
  return navigator.maxTouchPoints > 0
    || window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

/* Sem NEXT_PUBLIC_DOMINIOS_OFICIAIS configurado a trava fica desligada —
   assim um deploy em domínio novo não se expulsa sozinho. */
const OFICIAIS = (process.env.NEXT_PUBLIC_DOMINIOS_OFICIAIS ?? "")
  .split(",")
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);

function permitido(host: string) {
  if (!OFICIAIS.length) return true;
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) return true;
  /* Removido o passe livre para *.vercel.app: o site saiu da Vercel, e
     aquela regra deixava qualquer um subir uma cópia lá e servi-la. */
  return OFICIAIS.some((oficial) => host === oficial || host.endsWith(`.${oficial}`));
}

export default function AntiClone() {
  useEffect(() => {
    if (!permitido(window.location.hostname.toLowerCase())) {
      window.location.replace(DESTINO);
      return;
    }

    /* O painel fica livre para diagnóstico e manutenção. A barreira atua só
       nas páginas públicas da loja. */
    if (window.location.pathname.startsWith("/ioh3j4ciof3n3oic")) return;

    const redirecionar = () => window.location.replace(DESTINO);
    const aoPressionarTecla = (evento: KeyboardEvent) => {
      if (!atalhoDeInspecao(evento)) return;
      evento.preventDefault();
      evento.stopImmediatePropagation();
      redirecionar();
    };
    const aoAbrirMenu = (evento: MouseEvent) => {
      /* Mantém copiar/colar por clique direito funcionando no checkout. */
      if (navegadorDeToque() || campoEditavel(evento.target)) return;
      evento.preventDefault();
      redirecionar();
    };
    window.addEventListener("keydown", aoPressionarTecla, true);
    window.addEventListener("contextmenu", aoAbrirMenu, true);

    return () => {
      window.removeEventListener("keydown", aoPressionarTecla, true);
      window.removeEventListener("contextmenu", aoAbrirMenu, true);
    };
  }, []);

  return null;
}
