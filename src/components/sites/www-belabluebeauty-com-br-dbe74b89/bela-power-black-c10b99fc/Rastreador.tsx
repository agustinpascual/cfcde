"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/* Rastreador de sessão: heartbeat a cada 20s + eventos de funil.
   Guarda apenas um id aleatório no sessionStorage — nada de identificar
   a pessoa. Fica em silêncio se o Supabase não estiver configurado. */

const CHAVE = "bb:sessao";
const PING = 20000;

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

export function registrar(tipo: string, dados?: Record<string, unknown>) {
  try {
    const sessao = sessionStorage.getItem(CHAVE);
    if (!sessao) return;
    const corpo = JSON.stringify({ sessao, tipo, pagina: location.pathname, dados });
    // sendBeacon sobrevive à navegação; fetch é o plano B
    if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([corpo], { type: "application/json" }));
    else void fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: corpo, keepalive: true });
  } catch { /* rastreio nunca pode quebrar a página */ }
}

export default function Rastreador() {
  const pathname = usePathname();
  const secaoAtual = useRef<string>("");

  useEffect(() => {
    const sessao = idDaSessao();
    if (!sessao) return;

    const enviar = (tipo: string, extra?: Record<string, unknown>) => {
      const corpo = JSON.stringify({
        sessao, tipo, pagina: pathname,
        secao: secaoAtual.current || undefined,
        referencia: document.referrer || undefined,
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
