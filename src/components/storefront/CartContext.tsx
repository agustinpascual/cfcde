"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { produtos, type Produto } from "./brand";

export type ItemCarrinho = { produto: Produto; quantidade: number };

type Carrinho = {
  itens: ItemCarrinho[];
  quantidadeTotal: number;
  subtotal: number;
  aberto: boolean;
  abrir: () => void;
  fechar: () => void;
  adicionar: (produto: Produto, quantidade?: number) => void;
  remover: (id: string) => void;
  alterarQuantidade: (id: string, quantidade: number) => void;
  limpar: () => void;
};

const CarrinhoContext = createContext<Carrinho | null>(null);

const CHAVE = "sf-carrinho";

/* Persistimos só id + quantidade. O preço vem sempre do catálogo na
   remontagem — senão um carrinho antigo mostraria preço desatualizado. */
type ItemSalvo = { id: string; quantidade: number };

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [aberto, setAberto] = useState(false);
  /* Sem esta trava o efeito de gravação roda na montagem com o estado
     inicial vazio e apaga o que estava salvo antes da leitura valer. */
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    try {
      const bruto = localStorage.getItem(CHAVE);
      if (bruto) {
        const salvos: ItemSalvo[] = JSON.parse(bruto);
        const remontados = salvos
          .map(({ id, quantidade }) => {
            const produto = produtos.find((p) => p.id === id);
            return produto ? { produto, quantidade } : null;
          })
          .filter((item): item is ItemCarrinho => item !== null);

        setItens(remontados);
      }
    } catch {
      /* storage bloqueado ou JSON inválido: começa vazio */
    } finally {
      setCarregado(true);
    }
  }, []);

  useEffect(() => {
    if (!carregado) return;
    try {
      const salvos: ItemSalvo[] = itens.map((i) => ({
        id: i.produto.id,
        quantidade: i.quantidade,
      }));
      localStorage.setItem(CHAVE, JSON.stringify(salvos));
    } catch {}
  }, [itens, carregado]);

  const adicionar = useCallback((produto: Produto, quantidade = 1) => {
    setItens((atuais) => {
      const existente = atuais.find((i) => i.produto.id === produto.id);
      if (existente) {
        return atuais.map((i) =>
          i.produto.id === produto.id
            ? { ...i, quantidade: i.quantidade + quantidade }
            : i,
        );
      }
      return [...atuais, { produto, quantidade }];
    });
    setAberto(true);
  }, []);

  const remover = useCallback((id: string) => {
    setItens((atuais) => atuais.filter((i) => i.produto.id !== id));
  }, []);

  const alterarQuantidade = useCallback((id: string, quantidade: number) => {
    if (quantidade < 1) {
      setItens((atuais) => atuais.filter((i) => i.produto.id !== id));
      return;
    }
    setItens((atuais) =>
      atuais.map((i) => (i.produto.id === id ? { ...i, quantidade } : i)),
    );
  }, []);

  const limpar = useCallback(() => setItens([]), []);
  const abrir = useCallback(() => setAberto(true), []);
  const fechar = useCallback(() => setAberto(false), []);

  const valor = useMemo<Carrinho>(() => {
    const quantidadeTotal = itens.reduce((t, i) => t + i.quantidade, 0);
    const subtotal = itens.reduce(
      (t, i) => t + i.produto.preco * i.quantidade,
      0,
    );
    return {
      itens,
      quantidadeTotal,
      subtotal,
      aberto,
      abrir,
      fechar,
      adicionar,
      remover,
      alterarQuantidade,
      limpar,
    };
  }, [itens, aberto, abrir, fechar, adicionar, remover, alterarQuantidade, limpar]);

  return (
    <CarrinhoContext.Provider value={valor}>{children}</CarrinhoContext.Provider>
  );
}

export function useCarrinho() {
  const ctx = useContext(CarrinhoContext);
  if (!ctx) throw new Error("useCarrinho precisa estar dentro de <CartProvider>");
  return ctx;
}
