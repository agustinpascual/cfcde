"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { OFERTAS_POR_SLUG } from "./produtos-combo-plus-50ce9672/produto";
import { getProductBySlug } from "./shared/productCatalog";

const CHAVE = "cdp-sacola";
const EVENTO = "cdp-sacola-mudou";
const MAXIMO_POR_ITEM = 20;
const MAXIMO_TOTAL = 40;

export type CartProduct = {
  slug: string;
  name: string;
  image: string;
  priceCents: number;
  originalPrice: string | null;
};

export type CartItem = CartProduct & { quantity: number };
type ItemSalvo = { slug: string; quantity: number };

export function productForCart(slug: string): CartProduct | null {
  const oferta = OFERTAS_POR_SLUG[slug];
  if (oferta) return oferta;
  const produto = getProductBySlug(slug);
  return produto ? {
    slug: produto.slug,
    name: produto.name,
    image: produto.image,
    priceCents: produto.priceCents,
    originalPrice: produto.originalPrice,
  } : null;
}

function normalizar(salvos: unknown): CartItem[] {
  if (!Array.isArray(salvos)) return [];
  const porSlug = new Map<string, number>();
  for (const item of salvos) {
    if (!item || typeof item !== "object") continue;
    const slug = String((item as ItemSalvo).slug ?? "");
    const quantity = Math.min(MAXIMO_POR_ITEM, Math.max(0, Number((item as ItemSalvo).quantity) || 0));
    if (!Number.isInteger(quantity) || !productForCart(slug)) continue;
    porSlug.set(slug, Math.min(MAXIMO_POR_ITEM, (porSlug.get(slug) ?? 0) + quantity));
  }
  let restantes = MAXIMO_TOTAL;
  return [...porSlug].flatMap(([slug, quantity]) => {
    const product = productForCart(slug);
    const aceita = Math.min(quantity, restantes);
    restantes -= aceita;
    return product && aceita > 0 ? [{ ...product, quantity: aceita }] : [];
  });
}

function ler(): CartItem[] {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return [];
    /* Compatibilidade com a versão antiga, que guardava apenas um número. */
    if (/^\d+$/.test(bruto)) return normalizar([{ slug: "combo-plus", quantity: Number(bruto) }]);
    return normalizar(JSON.parse(bruto));
  } catch {
    return [];
  }
}

function salvar(itens: CartItem[]) {
  try {
    const salvos: ItemSalvo[] = itens.map(({ slug, quantity }) => ({ slug, quantity }));
    localStorage.setItem(CHAVE, JSON.stringify(salvos));
  } catch {}
  window.dispatchEvent(new Event(EVENTO));
}

/** Sacola compartilhada entre todas as páginas da loja. Preço, nome e imagem
 * são sempre remontados do catálogo atual; o navegador persiste só slug e
 * quantidade. */
export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const sincronizar = () => setItems(ler());
    sincronizar();
    window.addEventListener(EVENTO, sincronizar);
    window.addEventListener("storage", sincronizar);
    return () => {
      window.removeEventListener(EVENTO, sincronizar);
      window.removeEventListener("storage", sincronizar);
    };
  }, []);

  const commit = useCallback((transformar: (atuais: CartItem[]) => CartItem[]) => {
    setItems((atuais) => {
      const proximos = normalizar(transformar(atuais));
      queueMicrotask(() => salvar(proximos));
      return proximos;
    });
  }, []);

  const add = useCallback((product: CartProduct, quantity = 1) => {
    commit((atuais) => {
      const existente = atuais.find((item) => item.slug === product.slug);
      if (existente) return atuais.map((item) => item.slug === product.slug
        ? { ...item, quantity: Math.min(MAXIMO_POR_ITEM, item.quantity + quantity) }
        : item);
      return [...atuais, { ...product, quantity }];
    });
  }, [commit]);

  const changeQuantity = useCallback((slug: string, quantity: number) => {
    commit((atuais) => quantity < 1
      ? atuais.filter((item) => item.slug !== slug)
      : atuais.map((item) => item.slug === slug ? { ...item, quantity } : item));
  }, [commit]);

  const remove = useCallback((slug: string) => commit((atuais) => atuais.filter((item) => item.slug !== slug)), [commit]);
  const clear = useCallback(() => commit(() => []), [commit]);
  const quantity = useMemo(() => items.reduce((total, item) => total + item.quantity, 0), [items]);
  const subtotalCents = useMemo(() => items.reduce((total, item) => total + item.priceCents * item.quantity, 0), [items]);

  return { items, quantity, subtotalCents, add, changeQuantity, remove, clear };
}
