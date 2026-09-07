"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/* Meta Pixel.

   Dois detalhes que o snippet oficial não cobre e que quebram o rastreamento
   num app com navegação por cliente:

   1. O snippet dispara PageView uma vez, no carregamento. No App Router a
      troca de página não recarrega nada, então sem o efeito abaixo só a
      primeira página da visita seria contada.
   2. O ID vem de NEXT_PUBLIC_META_PIXEL_ID, congelado no build. Sem ele o
      componente não monta nada — assim ambiente de teste não polui os dados.

   A CSP em next.config.ts precisa liberar connect.facebook.net; sem isso o
   script é bloqueado sem erro visível. */

/* Aceita vários pixels separados por vírgula. `fbq('track', ...)` dispara
   para TODOS os pixels inicializados, então basta um init por ID e os
   eventos chegam nos dois sem duplicar chamada. */
const IDS = [...new Set((process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "")
  .split(",").map((s) => s.trim()).filter((id) => /^\d+$/.test(id)))];
const publico = (path: string) => path !== "/painel" && !path.startsWith("/painel/");
const pendentes: [string, Record<string, unknown> | undefined][] = [];
let aguardando = false;

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string };
    _fbq?: unknown;
    cdpMetaReady?: boolean;
  }
}

/** Guarda eventos até o snippet inicializar os pixels, sem interromper a página. */
export function pixel(evento: string, dados?: Record<string, unknown>) {
  if (typeof window === "undefined" || !IDS.length || !publico(window.location.pathname)) return;
  if (window.cdpMetaReady && window.fbq) {
    try { window.fbq("track", evento, dados); } catch { /* não interrompe a compra */ }
    return;
  }
  // O carregamento lento do script não descarta eventos após cinco segundos.
  pendentes.push([evento, dados]);
  if (!aguardando) {
    aguardando = true;
    window.addEventListener("cdp:meta-ready", () => {
      aguardando = false;
      for (const [nome, parametros] of pendentes.splice(0)) pixel(nome, parametros);
    }, { once: true });
  }
}

export const dadosProdutoPixel = (id: string, nome: string, centavos: number, quantidade = 1) => ({
  content_ids: [id], content_name: nome, content_type: "product",
  contents: [{ id, quantity: quantidade }], num_items: quantidade,
  currency: "BRL", value: Number((centavos / 100).toFixed(2)),
});

export function EventoMeta({ evento, dados, umaVezPor }: {
  evento: string; dados: Record<string, unknown>; umaVezPor?: string;
}) {
  const chave = JSON.stringify([evento, dados]);
  const identidade = umaVezPor === undefined ? chave : `${evento}:${umaVezPor}`;
  const ultima = useRef("");
  useEffect(() => {
    if (ultima.current === identidade) return;
    ultima.current = identidade;
    const [nome, parametros] = JSON.parse(chave);
    pixel(nome, parametros);
  }, [chave, identidade]);
  return null;
}

export default function MetaPixel() {
  const pathname = usePathname();
  const params = useSearchParams();
  const ultimaPagina = useRef("");
  const consulta = params.toString();

  useEffect(() => {
    const pagina = `${pathname}?${consulta}`;
    if (!IDS.length || !publico(pathname)) { ultimaPagina.current = ""; return; }
    if (ultimaPagina.current === pagina) return;
    ultimaPagina.current = pagina;
    pixel("PageView");
    const busca = new URLSearchParams(consulta).get("q")?.trim();
    if (pathname === "/busca" && busca) pixel("Search", { search_string: busca.slice(0, 80) });
  }, [pathname, consulta]);

  if (!IDS.length || !publico(pathname)) return null;

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">{`
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
${IDS.map((id) => `fbq('set','autoConfig',false,'${id}');fbq('init','${id}');`).join("")}
window.cdpMetaReady=true;window.dispatchEvent(new Event('cdp:meta-ready'));
      `}</Script>
      <noscript>
        {IDS.map((id) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={id} height="1" width="1" style={{ display: "none" }} alt=""
            src={`https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`} />
        ))}
      </noscript>
    </>
  );
}
