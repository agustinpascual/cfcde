"use client";

import { usePathname } from "next/navigation";

const raiz = "/sites/cafecomdeuspai-com-8456844d/root-8a5edab2";

// Fica fora da verificação de dispositivo: o navegador pode baixar o banner
// enquanto carrega o JavaScript, mas a loja continua fechada no computador.
// Só o formato preferencial é antecipado, evitando baixar AVIF e WebP juntos.
export default function PreloadHome() {
  if (usePathname() !== "/") return null;
  return <>
    <link rel="preload" as="image" type="image/avif" href={`${raiz}/hero-mobile-v4.avif`} media="(max-width: 640px)" fetchPriority="high" />
    <link rel="preload" as="image" type="image/avif" href={`${raiz}/hero-desktop-v4.avif`} media="(min-width: 641px)" fetchPriority="high" />
  </>;
}
