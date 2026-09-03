"use client";

import { useEffect, useRef } from "react";
import { X, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { Placeholder } from "./Placeholder";
import { useCarrinho } from "./CartContext";
import { useScrollLock } from "./useScrollLock";
import { brl } from "./format";

export function CartDrawer() {
  const { itens, quantidadeTotal, subtotal, aberto, fechar, remover, alterarQuantidade } =
    useCarrinho();
  const botaoFechar = useRef<HTMLButtonElement>(null);

  useScrollLock(aberto);

  /* Esc fecha; ao abrir, o foco vai para o botão de fechar */
  useEffect(() => {
    if (!aberto) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
    };
    document.addEventListener("keydown", onKey);
    botaoFechar.current?.focus();

    return () => document.removeEventListener("keydown", onKey);
  }, [aberto, fechar]);

  return (
    <>
      {/* Overlay — some por opacidade, sem desmontar, para animar nos dois sentidos */}
      <div
        onClick={fechar}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          aberto ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Sacola de compras"
        aria-hidden={!aberto}
        className={`fixed inset-y-0 right-0 z-50 flex w-[92%] max-w-[420px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          aberto ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--sf-line)] px-5">
          <h2 className="flex items-center gap-2 text-[14px] font-semibold">
            <ShoppingBag className="h-5 w-5" strokeWidth={1.75} />
            Sua sacola
            {quantidadeTotal > 0 ? (
              <span className="text-[var(--sf-muted)]">({quantidadeTotal})</span>
            ) : null}
          </h2>
          <button
            ref={botaoFechar}
            onClick={fechar}
            aria-label="Fechar sacola"
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-[var(--sf-surface-2)]"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </header>

        {itens.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <ShoppingBag className="h-10 w-10 text-[var(--sf-line)]" strokeWidth={1.25} />
            <p className="text-[13px] text-[var(--sf-ink-2)]">Sua sacola está vazia.</p>
            <button
              onClick={fechar}
              className="mt-1 text-[13px] font-medium text-[var(--sf-accent)] underline underline-offset-4"
            >
              Continuar comprando
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <ul className="flex flex-col gap-4">
                {itens.map(({ produto, quantidade }) => (
                  <li
                    key={produto.id}
                    className="flex gap-3 border-b border-[var(--sf-line)] pb-4 last:border-0"
                  >
                    <div className="w-[76px] shrink-0 overflow-hidden rounded-[var(--sf-radius)] border border-[var(--sf-line)]">
                      <Placeholder ratio="1 / 1" />
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="line-clamp-2 text-[12px] leading-snug text-[var(--sf-ink-2)] uppercase">
                        {produto.nome}
                      </p>
                      <p className="mt-1 text-[14px] font-semibold">
                        {brl(produto.preco * quantidade)}
                      </p>

                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center rounded-[var(--sf-radius)] border border-[var(--sf-line)]">
                          <button
                            onClick={() => alterarQuantidade(produto.id, quantidade - 1)}
                            aria-label={`Diminuir ${produto.nome}`}
                            className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-[var(--sf-surface-2)]"
                          >
                            <Minus className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>
                          <span className="w-8 text-center text-[13px] tabular-nums">
                            {quantidade}
                          </span>
                          <button
                            onClick={() => alterarQuantidade(produto.id, quantidade + 1)}
                            aria-label={`Aumentar ${produto.nome}`}
                            className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-[var(--sf-surface-2)]"
                          >
                            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>
                        </div>

                        <button
                          onClick={() => remover(produto.id)}
                          aria-label={`Remover ${produto.nome}`}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--sf-muted)] transition-colors hover:bg-[var(--sf-surface-2)] hover:text-[var(--sf-sale)]"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <footer className="shrink-0 border-t border-[var(--sf-line)] px-5 py-4">
              <div className="mb-3 flex items-baseline justify-between">
                <span className="text-[13px] text-[var(--sf-ink-2)]">Subtotal</span>
                <span className="text-[18px] font-semibold">{brl(subtotal)}</span>
              </div>
              <p className="mb-3 text-[11px] text-[var(--sf-muted)]">
                Frete e descontos calculados no checkout.
              </p>
              {/* TODO: /checkout ainda é o fluxo antigo de produto único —
                  não recebe os itens desta sacola. Precisa ser ligado. */}
              <a
                href="/checkout"
                className="block rounded-[var(--sf-radius)] bg-[var(--sf-ink)] py-3.5 text-center text-[13px] font-medium text-white transition-opacity hover:opacity-90"
              >
                Finalizar compra
              </a>
              <button
                onClick={fechar}
                className="mt-2 w-full py-2 text-[12px] text-[var(--sf-ink-2)] underline underline-offset-4"
              >
                Continuar comprando
              </button>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
