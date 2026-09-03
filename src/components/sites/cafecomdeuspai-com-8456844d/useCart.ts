"use client";

import { useCallback, useEffect, useState } from "react";

const CHAVE = "cdp-sacola";
/* Evento próprio: o "storage" do navegador só avisa outras abas, e aqui a
   sacola precisa sincronizar entre componentes da mesma página. */
const EVENTO = "cdp-sacola-mudou";

function ler(): number {
  try {
    const bruto = localStorage.getItem(CHAVE);
    const valor = bruto ? Number.parseInt(bruto, 10) : 0;
    return Number.isFinite(valor) && valor > 0 ? valor : 0;
  } catch {
    return 0;
  }
}

/* Quantidade da sacola compartilhada entre as páginas. Começa em 0 no
   servidor e no primeiro render para não quebrar a hidratação — o valor
   salvo entra no efeito logo em seguida. */
export function useCartQuantity() {
  const [quantidade, setQuantidade] = useState(0);

  useEffect(() => {
    const sincronizar = () => setQuantidade(ler());
    sincronizar();
    window.addEventListener(EVENTO, sincronizar);
    window.addEventListener("storage", sincronizar);
    return () => {
      window.removeEventListener(EVENTO, sincronizar);
      window.removeEventListener("storage", sincronizar);
    };
  }, []);

  const atualizar = useCallback((proxima: number) => {
    const valor = Math.max(0, proxima);
    setQuantidade(valor);
    try {
      localStorage.setItem(CHAVE, String(valor));
    } catch {}
    window.dispatchEvent(new Event(EVENTO));
  }, []);

  return [quantidade, atualizar] as const;
}
