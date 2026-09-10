"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type DadosEvento = Record<string, unknown> | undefined;
type EventoPendente = [string, DadosEvento];
type ConfigMarketing = { metaPixelIds: string[]; googleTagId: string };

const IDS_FALLBACK = [...new Set((process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "")
  .split(",").map((id) => id.trim()).filter((id) => /^\d{8,25}$/.test(id)))];
const publico = (path: string) => path !== "/painel" && !path.startsWith("/painel/");
const filaMeta: EventoPendente[] = [];
const filaGoogle: EventoPendente[] = [];
let configResolvida = false;
let idsMeta: string[] = [];
let tagGoogle = "";
let metaPronto = false;
let googlePronto = false;

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string };
    _fbq?: unknown;
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
    cdpMarketingQueue?: Array<[string, DadosEvento, boolean]>;
    cdpTrackMarketing?: (evento: string, dados?: DadosEvento, somenteGoogle?: boolean) => void;
  }
}

const guardar = (fila: EventoPendente[], evento: EventoPendente) => {
  fila.push(evento);
  if (fila.length > 100) fila.shift();
};

function dadosGoogle(evento: string, dados: DadosEvento) {
  const nomes: Record<string, string> = {
    PageView: "page_view", Search: "search", ViewContent: "view_item",
    AddToCart: "add_to_cart", InitiateCheckout: "begin_checkout",
    AddPaymentInfo: "add_payment_info", Purchase: "purchase",
  };
  const nome = nomes[evento] ?? evento.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
  const origem = dados ?? {};
  const contentIds = Array.isArray(origem.content_ids) ? origem.content_ids : [];
  const quantidade = Number(origem.num_items ?? 1);
  const parametros: Record<string, unknown> = {
    ...origem,
    ...(contentIds.length ? { items: contentIds.map((id) => ({
      item_id: String(id), item_name: String(origem.content_name ?? id), quantity: quantidade,
    })) } : {}),
    ...(evento === "PageView" && typeof window !== "undefined"
      ? { page_location: window.location.href, page_path: `${window.location.pathname}${window.location.search}` }
      : {}),
  };
  return { nome, parametros };
}

function enviarMeta([evento, dados]: EventoPendente) {
  if (!idsMeta.length) return;
  if (!metaPronto || !window.fbq) { guardar(filaMeta, [evento, dados]); return; }
  try { window.fbq("track", evento, dados); } catch { /* marketing nunca interrompe a compra */ }
}

function enviarGoogle([evento, dados]: EventoPendente) {
  if (!tagGoogle) return;
  if (!googlePronto) { guardar(filaGoogle, [evento, dados]); return; }
  const { nome, parametros } = dadosGoogle(evento, dados);
  try {
    if (tagGoogle.startsWith("GTM-")) window.dataLayer?.push({ event: nome, ...parametros });
    else window.gtag?.("event", nome, parametros);
  } catch { /* marketing nunca interrompe a compra */ }
}

function distribuir(evento: EventoPendente, somenteGoogle = false) {
  if (!somenteGoogle) enviarMeta(evento);
  enviarGoogle(evento);
}

/** Envia o mesmo evento comercial para Meta e Google, com filas independentes. */
export function pixel(evento: string, dados?: Record<string, unknown>) {
  if (typeof window === "undefined" || !publico(window.location.pathname)) return;
  if (window.cdpTrackMarketing) { window.cdpTrackMarketing(evento, dados, false); return; }
  const fila = window.cdpMarketingQueue ??= [];
  fila.push([evento, dados, false]);
  if (fila.length > 100) fila.shift();
}

/** Purchase do Google no retorno aprovado; a Meta recebe Purchase pelo webhook. */
export function eventoGoogle(evento: string, dados?: Record<string, unknown>) {
  if (typeof window === "undefined" || !publico(window.location.pathname)) return;
  if (window.cdpTrackMarketing) { window.cdpTrackMarketing(evento, dados, true); return; }
  const fila = window.cdpMarketingQueue ??= [];
  fila.push([evento, dados, true]);
  if (fila.length > 100) fila.shift();
}

function aplicarConfig(config: ConfigMarketing) {
  idsMeta = [...new Set(config.metaPixelIds.filter((id) => /^\d{8,25}$/.test(id)))];
  tagGoogle = /^(?:G|GT|AW|GTM)-[A-Z0-9-]{4,40}$/i.test(config.googleTagId) ? config.googleTagId.toUpperCase() : "";
  configResolvida = true;
  /* A ponte fica em window porque páginas e layout podem chegar em chunks
     distintos. Assim eventos emitidos pelo produto/carrinho nunca dependem
     de compartilhar o mesmo estado de módulo do componente do layout. */
  window.cdpTrackMarketing = (evento, dados, somenteGoogle = false) => distribuir([evento, dados], somenteGoogle);
  for (const [evento, dados, somenteGoogle] of window.cdpMarketingQueue?.splice(0) ?? []) {
    distribuir([evento, dados], somenteGoogle);
  }
}

function metaCarregada() {
  metaPronto = true;
  for (const evento of filaMeta.splice(0)) enviarMeta(evento);
}

function googleCarregado() {
  googlePronto = true;
  for (const evento of filaGoogle.splice(0)) enviarGoogle(evento);
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
  /* O callback de ref acompanha o commit real do produto no DOM. Em páginas
     pré-renderizadas, o efeito passivo podia ser postergado/descartado durante
     a hidratação e ViewContent não saía, embora cliques posteriores saíssem. */
  return <i hidden aria-hidden="true" data-evento-marketing={evento} ref={(elemento) => {
    if (!elemento || ultima.current === identidade) return;
    ultima.current = identidade;
    const [nome, parametros] = JSON.parse(chave);
    queueMicrotask(() => pixel(nome, parametros));
  }} />;
}

export default function MetaPixel() {
  const pathname = usePathname();
  const params = useSearchParams();
  const ultimaPagina = useRef("");
  const consulta = params.toString();
  const [config, setConfig] = useState<ConfigMarketing | null>(null);

  useEffect(() => {
    if (!publico(pathname) || configResolvida) return;
    const controlador = new AbortController();
    const concluir = (segura: ConfigMarketing) => {
      aplicarConfig(segura);
      /* Registra a primeira URL no mesmo passo que libera as filas. Em
         árvores com Suspense, esperar outro ciclo de efeito podia deixar o
         PageView inicial para trás enquanto ViewContent já era enviado. */
      const pagina = `${pathname}?${consulta}`;
      /* Os scripts disparam o primeiro PageView em onReady. Manter a URL aqui
         evita que o efeito de navegação o duplique quando setConfig renderizar. */
      ultimaPagina.current = pagina;
      setConfig(segura);
    };
    void fetch("/api/marketing/config", {
      signal: AbortSignal.any([controlador.signal, AbortSignal.timeout(5000)]),
    }).then(async (resposta) => {
      if (!resposta.ok) throw new Error("configuração indisponível");
      const dados = await resposta.json() as ConfigMarketing;
      const segura = {
        metaPixelIds: Array.isArray(dados.metaPixelIds) ? dados.metaPixelIds : [],
        googleTagId: typeof dados.googleTagId === "string" ? dados.googleTagId : "",
      };
      concluir(segura);
    }).catch(() => {
      if (controlador.signal.aborted) return;
      const fallback = { metaPixelIds: IDS_FALLBACK, googleTagId: "" };
      concluir(fallback);
    });
    return () => controlador.abort();
  }, [pathname, consulta]);

  useEffect(() => {
    const pagina = `${pathname}?${consulta}`;
    /* Aguarda a configuração pública: assim PageView nunca disputa a primeira
       montagem do Script nem se perde entre a fila pré-configuração e onReady. */
    if (!config || !publico(pathname)) { ultimaPagina.current = ""; return; }
    if (ultimaPagina.current === pagina) return;
    ultimaPagina.current = pagina;
    pixel("PageView");
    const busca = new URLSearchParams(consulta).get("q")?.trim();
    if (pathname === "/busca" && busca) pixel("Search", { search_string: busca.slice(0, 80) });
  }, [pathname, consulta, config]);

  if (!config || !publico(pathname)) return null;
  const ids = [...new Set(config.metaPixelIds.filter((id) => /^\d{8,25}$/.test(id)))];
  const google = /^(?:G|GT|AW|GTM)-[A-Z0-9-]{4,40}$/i.test(config.googleTagId)
    ? config.googleTagId.toUpperCase() : "";

  return (
    <>
      {ids.length ? <>
        <Script id="meta-pixel" strategy="lazyOnload" onReady={metaCarregada}>{`
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
${ids.map((id) => `fbq('set','autoConfig',false,'${id}');fbq('init','${id}');`).join("")}
fbq('track','PageView');
        `}</Script>
        <noscript>{ids.map((id) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={id} height="1" width="1" style={{ display: "none" }} alt=""
            src={`https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`} />
        ))}</noscript>
      </> : null}

      {google ? google.startsWith("GTM-") ? (
        <Script id="google-tag-manager" strategy="lazyOnload" onReady={googleCarregado}>{`
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${google}');
window.dataLayer.push({event:'page_view',page_location:window.location.href,page_path:window.location.pathname+window.location.search});
        `}</Script>
      ) : <>
        <Script id="google-tag-sdk" src={`https://www.googletagmanager.com/gtag/js?id=${google}`} strategy="lazyOnload" />
        <Script id="google-tag-init" strategy="lazyOnload" onReady={googleCarregado}>{`
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}
window.gtag=gtag;gtag('js',new Date());gtag('config','${google}',{send_page_view:false});
gtag('event','page_view',{page_location:window.location.href,page_path:window.location.pathname+window.location.search});
        `}</Script>
      </> : null}
    </>
  );
}
