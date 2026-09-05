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

/* Sem NEXT_PUBLIC_DOMINIOS_OFICIAIS configurado a trava fica desligada —
   assim um deploy em domínio novo não se expulsa sozinho. */
const OFICIAIS = (process.env.NEXT_PUBLIC_DOMINIOS_OFICIAIS ?? "")
  .split(",")
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);

function permitido(host: string) {
  if (!OFICIAIS.length) return true;
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) return true;
  if (host.endsWith(".vercel.app")) return true;
  return OFICIAIS.some((oficial) => host === oficial || host.endsWith(`.${oficial}`));
}

export default function AntiClone() {
  useEffect(() => {
    if (permitido(window.location.hostname.toLowerCase())) return;
    window.location.replace(DESTINO);
  }, []);

  return null;
}
