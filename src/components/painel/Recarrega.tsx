"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/* Recarrega os dados do servidor em intervalo fixo, sem piscar a tela. */
export default function Recarrega({ segundos = 15 }: { segundos?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), segundos * 1000);
    return () => clearInterval(id);
  }, [router, segundos]);
  return null;
}
