"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/* Rastreador de sessão: heartbeat a cada 20s + eventos de funil.
   Guarda apenas um id aleatório no sessionStorage — nada de identificar
   a pessoa. Fica em silêncio se o Supabase não estiver configurado. */

const CHAVE = "bb:sessao";
const PING = 20000;

/* O painel admin não é visita de cliente. Sem isso o seu próprio acesso
   aparecia no mapa ao vivo e contava no funil. */
const PRIVADAS = ["/ioh3j4ciof3n3oic"];
export const rastreavel = (caminho: string) => !PRIVADAS.some((p) => caminho.startsWith(p));

function idDaSessao() {
  try {
    let id = sessionStorage.getItem(CHAVE);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(CHAVE, id);
    }
    return id;
  } catch {
    return null; // storage bloqueado — não rastreia
  }
}

function ambienteDoDispositivo() {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  return {
    plataforma: nav.userAgentData?.platform || navigator.platform || undefined,
    toques: navigator.maxTouchPoints || 0,
  };
}

function corpoDoEvento(tipo: string, dados?: Record<string, unknown>) {
  try {
    if (!rastreavel(location.pathname)) return null;
    /* Garante o id aqui também. Eventos disparados imediatamente depois que
       o checkout monta não podem depender do useEffect do componente global
       já ter criado a sessão. */
    const sessao = idDaSessao();
    if (!sessao) return null;
    /* `pedido` sobe para o nível de cima além de ficar em `dados`: a rota
       usa o campo raiz para gravar pedido_ref na sessão, que é o que liga a
       trilha do visitante ao pedido na tela de detalhe. */
    return JSON.stringify({
      sessao, tipo, pagina: location.pathname, dados,
      ...ambienteDoDispositivo(),
      ...(typeof dados?.pedido === "string" ? { pedido: dados.pedido } : {}),
    });
  } catch {
    return null; // rastreio nunca pode quebrar a página
  }
}

export function registrar(tipo: string, dados?: Record<string, unknown>) {
  const corpo = corpoDoEvento(tipo, dados);
  if (!corpo) return;
  try {
    // sendBeacon sobrevive à navegação, mas pode recusar a fila e retornar false.
    const enfileirado = navigator.sendBeacon?.(
      "/api/track",
      new Blob([corpo], { type: "application/json" }),
    ) ?? false;
    if (enfileirado) return;
    void fetch("/api/track", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: corpo, keepalive: true,
    }).catch(() => {});
  } catch { /* rastreio nunca pode quebrar a página */ }
}

/* Para dados importantes, como carrinho abandonado, espera a confirmação da
   API e tenta mais uma vez. A função comum acima continua sendo usada ao sair,
   quando não há tempo para aguardar uma resposta. */
export async function registrarConfirmado(tipo: string, dados?: Record<string, unknown>) {
  const corpo = corpoDoEvento(tipo, dados);
  if (!corpo) return false;
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try {
      const resposta = await fetch("/api/track", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: corpo, keepalive: true,
      });
      const retorno = await resposta.json().catch(() => null) as { ok?: unknown } | null;
      if (resposta.ok && retorno?.ok === true) return true;
    } catch { /* tenta novamente logo abaixo */ }
    if (tentativa === 0) await new Promise((resolve) => window.setTimeout(resolve, 400));
  }
  return false;
}

export default function Rastreador() {
  const pathname = usePathname();
  const secaoAtual = useRef<string>("");

  useEffect(() => {
    if (!rastreavel(pathname)) return;
    const sessao = idDaSessao();
    if (!sessao) return;

    const enviar = (tipo: string, extra?: Record<string, unknown>) => {
      const corpo = JSON.stringify({
        sessao, tipo, pagina: pathname,
        secao: secaoAtual.current || undefined,
        referencia: document.referrer || undefined,
        ...ambienteDoDispositivo(),
        ...extra,
      });
      void fetch("/api/track", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: corpo, keepalive: true,
      }).catch(() => {});
    };

    enviar("pageview");
    if (pathname.startsWith("/checkout")) enviar("checkout");
    if (pathname.startsWith("/pagamento")) enviar("pix_gerado");

    const bater = setInterval(() => enviar(""), PING); // "" = só heartbeat

    /* qual bloco da página está à vista */
    const alvos = [...document.querySelectorAll("[data-secao]")];
    const obs = new IntersectionObserver(
      (entradas) => {
        const visivel = entradas.filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const nome = visivel?.target.getAttribute("data-secao");
        if (nome && nome !== secaoAtual.current) {
          secaoAtual.current = nome;
          enviar("secao");
        }
      },
      { threshold: [0.25, 0.6] }
    );
    alvos.forEach((a) => obs.observe(a));

    const aoSair = () => enviar("saida");
    window.addEventListener("pagehide", aoSair);

    return () => {
      clearInterval(bater);
      obs.disconnect();
      window.removeEventListener("pagehide", aoSair);
    };
  }, [pathname]);

  return null;
}
