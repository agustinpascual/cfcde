"use client";
import { useSyncExternalStore } from "react";
import { kits, produto } from "./data";

/* Carrinho leve em localStorage: guarda o kit escolhido e a quantidade.
   O produto adiciona; o checkout lê. Nenhum dado sai do navegador. */
export type CarrinhoItem = { kitIndex: number; qtd: number };

const CHAVE = "bb:carrinho:bela-power-black-c10b99fc";

export const precoNumero = (v: string) => Number(v.replace(/[^\d,]/g, "").replace(",", "."));
export const moeda = (n: number) => `R$${n.toFixed(2).replace(".", ",")}`;

export function lerCarrinho(): CarrinhoItem {
  const padrao: CarrinhoItem = { kitIndex: 0, qtd: 1 };
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (!bruto) return padrao;
    const o = JSON.parse(bruto);
    const kitIndex = Number.isInteger(o?.kitIndex) && o.kitIndex >= 0 && o.kitIndex < kits.length ? o.kitIndex : 0;
    const qtd = Number.isInteger(o?.qtd) && o.qtd > 0 && o.qtd <= 99 ? o.qtd : 1;
    return { kitIndex, qtd };
  } catch {
    return padrao; // storage bloqueado ou JSON corrompido
  }
}

export function gravarCarrinho(item: CarrinhoItem) {
  cache = item;
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(item));
  } catch {
    /* sem storage — o checkout cai no padrão */
  }
}

/* Resolve o item do carrinho em linhas de resumo para o checkout. */
export function resumo(item: CarrinhoItem) {
  const kit = kits[item.kitIndex] ?? kits[0];
  const unit = precoNumero(kit.total);
  const de = kit.de ? precoNumero(kit.de) : precoNumero(produto.de);
  const subtotal = unit * item.qtd;
  return {
    kit,
    qtd: item.qtd,
    titulo: produto.nome,
    imagem: produto.galeria[0].full,
    original: de * item.qtd,
    subtotal,
    desconto: 0,
    total: subtotal,
  };
}

/* ---------- leitura reativa (sem setState em efeito) ---------- */
const PADRAO: CarrinhoItem = { kitIndex: 0, qtd: 1 };
let cache: CarrinhoItem | null = null;
const ouvintes = new Set<() => void>();

function subscribe(l: () => void) {
  ouvintes.add(l);
  const onStorage = (e: StorageEvent) => { if (e.key === CHAVE) { cache = null; ouvintes.forEach((x) => x()); } };
  window.addEventListener("storage", onStorage);
  return () => { ouvintes.delete(l); window.removeEventListener("storage", onStorage); };
}

function snapshot(): CarrinhoItem {
  if (cache === null) cache = lerCarrinho();
  return cache;
}

/* O snapshot do servidor é o padrão, então o HTML estático fica determinístico
   e o carrinho salvo entra depois da hidratação. */
export function useCarrinho(): CarrinhoItem {
  return useSyncExternalStore(subscribe, snapshot, () => PADRAO);
}
