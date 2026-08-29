"use client";
import { useCallback, useSyncExternalStore } from "react";
import { produto } from "./data";

/* Estoque compartilhado entre a barra "QUEIMA TOTAL" e as notificações de compra.
   É uma store externa (localStorage + memória) lida com useSyncExternalStore:
   ao recarregar a página o contador continua de onde parou.
   O snapshot do servidor é sempre produto.estoque, então o HTML estático
   permanece determinístico e o valor salvo entra depois da hidratação. */
const ESTOQUE_MINIMO = 2;
const CHAVE = "bb:estoque:bela-power-black-c10b99fc";

const ouvintes = new Set<() => void>();
let cache: number | null = null;

function ler(): number | null {
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (bruto === null) return null;
    const n = Number.parseInt(bruto, 10);
    // descarta valor corrompido ou fora da faixa válida
    if (!Number.isFinite(n) || n < ESTOQUE_MINIMO || n > produto.estoque) return null;
    return n;
  } catch {
    return null; // modo privado / storage bloqueado
  }
}

function gravar(n: number) {
  try {
    window.localStorage.setItem(CHAVE, String(n));
  } catch {
    /* storage indisponível — segue só em memória */
  }
}

function valorAtual(): number {
  if (cache === null) cache = ler() ?? produto.estoque;
  return cache;
}

function definir(n: number) {
  if (n === cache) return;
  cache = n;
  ouvintes.forEach((l) => l());
}

function subscribe(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  // mantém abas abertas em sincronia
  const onStorage = (e: StorageEvent) => {
    if (e.key !== CHAVE) return;
    cache = null;
    ouvintes.forEach((l) => l());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    ouvintes.delete(ouvinte);
    window.removeEventListener("storage", onStorage);
  };
}

export function useStock() {
  const estoque = useSyncExternalStore(subscribe, valorAtual, () => produto.estoque);

  const registrarCompra = useCallback(() => {
    const atual = valorAtual();
    if (atual > ESTOQUE_MINIMO) {
      gravar(atual - 1);
      definir(atual - 1);
    }
  }, []);

  return { estoque, registrarCompra };
}

/* Mantido para o page.tsx: a store é global, então o provider é só um passthrough. */
export function StockProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
