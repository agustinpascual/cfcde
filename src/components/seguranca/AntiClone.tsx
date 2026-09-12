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
const LIMIAR_DEVTOOLS = 180;
const executarPausaDeDepuracao = Function("debugger") as () => void;

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

function devtoolsAcoplado() {
  const diferencaHorizontal = window.outerWidth - window.innerWidth;
  const diferencaVertical = window.outerHeight - window.innerHeight;

  return diferencaHorizontal > LIMIAR_DEVTOOLS
    || diferencaVertical > LIMIAR_DEVTOOLS;
}

function depuradorAtivo() {
  const inicio = performance.now();
  executarPausaDeDepuracao();
  return performance.now() - inicio > 120;
}

/* Em navegadores móveis, outerHeight inclui partes das barras do Safari e do
   Chrome que não entram em innerHeight. Essa diferença pode passar do limiar
   usado no desktop e parecia DevTools aberto, expulsando um visitante normal
   em até 750 ms. Em telas de toque mantemos a trava de domínio, mas não usamos
   heurísticas de dimensões/depuração que os navegadores móveis não garantem. */
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
    const verificarDevtools = () => {
      if (navegadorDeToque()) return;
      if (devtoolsAcoplado() || depuradorAtivo()) redirecionar();
    };

    window.addEventListener("keydown", aoPressionarTecla, true);
    window.addEventListener("contextmenu", aoAbrirMenu, true);
    window.addEventListener("resize", verificarDevtools, true);
    window.addEventListener("focus", verificarDevtools, true);
    document.addEventListener("visibilitychange", verificarDevtools, true);
    const intervalo = window.setInterval(verificarDevtools, 750);
    verificarDevtools();

    return () => {
      window.removeEventListener("keydown", aoPressionarTecla, true);
      window.removeEventListener("contextmenu", aoAbrirMenu, true);
      window.removeEventListener("resize", verificarDevtools, true);
      window.removeEventListener("focus", verificarDevtools, true);
      document.removeEventListener("visibilitychange", verificarDevtools, true);
      window.clearInterval(intervalo);
    };
  }, []);

  return null;
}
