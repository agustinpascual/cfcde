"use client";

import { useEffect } from "react";

/* Contador compartilhado: o drawer do menu e o do carrinho podem
   travar o scroll ao mesmo tempo sem um destravar o outro ao fechar. */
let travas = 0;

export function useScrollLock(ativo: boolean) {
  useEffect(() => {
    if (!ativo) return;

    travas += 1;
    document.body.style.overflow = "hidden";

    return () => {
      travas -= 1;
      if (travas === 0) document.body.style.overflow = "";
    };
  }, [ativo]);
}
