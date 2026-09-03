"use client";

import { useEffect, useState } from "react";
import LoadingScreen from "./LoadingScreen";

/* Cobre a primeira visita: some no evento "load" (quando imagens e fontes
   terminam) e tem um teto de 4s para nunca prender quem chegou na loja. */
const TETO_MS = 4000;

export default function SplashScreen() {
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

  return <LoadingScreen hidden={pronto} />;
}
