"use client";

import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { dispositivoPodeAbrirLoja } from "@/lib/dispositivos";
import styles from "./AcessoDispositivo.module.css";

// A identificação não depende da largura, orientação ou presença de teclado.
// O servidor não recebe maxTouchPoints: verificar só o User-Agent barraria
// iPads em modo desktop. Sem confirmação, a loja ainda não é montada.
const assinar = () => () => {};
const noServidor = (): boolean | null => null;
function noNavegador() {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  return dispositivoPodeAbrirLoja(nav.userAgent, nav.userAgentData?.platform || nav.platform, nav.maxTouchPoints);
}

export default function AcessoDispositivo({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const permitido = useSyncExternalStore(assinar, noNavegador, noServidor);
  const painel = pathname === "/ioh3j4ciof3n3oic" || pathname.startsWith("/ioh3j4ciof3n3oic/");

  useEffect(() => {
    if (!painel && permitido === false) window.location.replace("https://www.google.com");
  }, [painel, permitido]);

  // Mantém login, páginas e navegação interna do painel em qualquer aparelho.
  // As APIs e os webhooks não passam pelo layout e continuam independentes.
  if (painel || permitido) return children;

  return (
    <main className={styles.tela}>
      <section className={styles.mensagem} aria-labelledby="acesso-dispositivo-titulo">
        <p className={styles.marca}>Café com Deus Pai</p>
        {permitido === null ? (
          <>
            <h1 id="acesso-dispositivo-titulo">Bem-vindo</h1>
            <p role="status">Verificando seu dispositivo…</p>
            <noscript>Ative o JavaScript e abra este site em um celular ou tablet.</noscript>
          </>
        ) : (
          <>
            <h1 id="acesso-dispositivo-titulo">Redirecionando…</h1>
            <p role="status">Aguarde um instante.</p>
          </>
        )}
      </section>
    </main>
  );
}
