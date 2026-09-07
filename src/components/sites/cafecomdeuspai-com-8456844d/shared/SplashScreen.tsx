"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import LoadingScreen from "./LoadingScreen";

/* Cobre a primeira visita: some no evento "load" (quando imagens e fontes
   terminam) e tem um teto de 4s para nunca prender quem chegou na loja. */
const TETO_MS = 4000;

/* Rotas onde a splash atrapalha: quem está pagando não pode esperar uma
   animação de marca para ver o código PIX. A splash é boas-vindas da loja,
   não interlúdio no meio de uma compra. */
const SEM_SPLASH = ["/pagamento", "/checkout", "/painel"];

export default function SplashScreen() {
  const pathname = usePathname();
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    const encerrar = () => setPronto(true);

    if (document.readyState === "complete") {
      const imediato = window.setTimeout(encerrar, 150);
      return () => window.clearTimeout(imediato);
    }

    const teto = window.setTimeout(encerrar, TETO_MS);
    window.addEventListener("load", encerrar);
    return () => {
      window.clearTimeout(teto);
      window.removeEventListener("load", encerrar);
    };
  }, []);

  if (SEM_SPLASH.some((r) => pathname.startsWith(r))) return null;
  return <LoadingScreen hidden={pronto} />;
}
