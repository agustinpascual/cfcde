"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/* Recarrega os dados do servidor em intervalo fixo, sem piscar a tela. */
export default function Recarrega({ segundos = 15 }: { segundos?: number }) {
  const router = useRouter();
  useEffect(() => {
    const atualizar = () => {
      if (document.visibilityState !== "hidden") router.refresh();
    };
    const id = setInterval(atualizar, segundos * 1000);
    window.addEventListener("focus", atualizar);
    document.addEventListener("visibilitychange", atualizar);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", atualizar);
      document.removeEventListener("visibilitychange", atualizar);
    };
  }, [router, segundos]);
  return null;
}
