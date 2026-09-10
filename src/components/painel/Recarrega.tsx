"use client";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef } from "react";

/* Recarrega os dados do servidor em intervalo fixo, sem piscar a tela. */
export default function Recarrega({ segundos = 15 }: { segundos?: number }) {
  const router = useRouter();
  const ultimaAtualizacao = useRef(0);
  useEffect(() => {
    const atualizar = () => {
      const agora = Date.now();
      if (document.visibilityState === "hidden" || agora - ultimaAtualizacao.current < 1200) return;
      ultimaAtualizacao.current = agora;
      startTransition(() => router.refresh());
    };
    const id = setInterval(atualizar, segundos * 1000);
    window.addEventListener("focus", atualizar);
    const aoVoltar = () => { if (document.visibilityState === "visible") atualizar(); };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", atualizar);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [router, segundos]);
  return null;
}
