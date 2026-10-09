"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { dispositivoPodeAbrirLoja } from "@/lib/dispositivos";

const assinar = () => () => {};
const noServidor = () => false;
function noNavegador() {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  return dispositivoPodeAbrirLoja(nav.userAgent, nav.userAgentData?.platform || nav.platform, nav.maxTouchPoints);
}

export default function AcessoDispositivo({ children, recursos }: { children: ReactNode; recursos?: ReactNode }) {
  const navegadorConfirmado = useSyncExternalStore(assinar, noNavegador, noServidor);
  return <>{children}{navegadorConfirmado && recursos}</>;
}
