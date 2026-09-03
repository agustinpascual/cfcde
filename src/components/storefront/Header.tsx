"use client";

import { useEffect, useState } from "react";
import { Menu, X, Search, ShoppingBag } from "lucide-react";
import { marca, menu } from "./brand";
import { useCarrinho } from "./CartContext";
import { useScrollLock } from "./useScrollLock";

export function Header() {
  const [drawer, setDrawer] = useState(false);
  const [busca, setBusca] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { quantidadeTotal, abrir } = useCarrinho();

  useScrollLock(drawer);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 bg-white transition-shadow ${
        scrolled ? "shadow-[0_1px_12px_rgba(0,0,0,.08)]" : "border-b border-[var(--sf-line)]"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[var(--sf-container)] items-center gap-4 px-4 sm:px-6">
        <button aria-label="Abrir menu" onClick={() => setDrawer(true)} className="lg:hidden">
          <Menu className="h-6 w-6" strokeWidth={1.75} />
        </button>

        {/* Wordmark. Troque por <Image src={marca.logo} /> quando tiver o arquivo. */}
        <a href="/" className="shrink-0 text-[15px] font-semibold tracking-[.18em] uppercase">
          {marca.nome}
        </a>

        <nav className="ml-6 hidden flex-1 items-center gap-7 lg:flex">
          {menu.map((item) => (
            <a
              key={item.rotulo}
              href={item.href}
              className="text-[13px] text-[var(--sf-ink-2)] transition-colors hover:text-[var(--sf-accent)]"
            >
              {item.rotulo}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <button
            aria-label="Buscar"
            onClick={() => setBusca((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-[var(--sf-surface-2)]"
          >
            <Search className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <button
            onClick={abrir}
            aria-label={`Abrir sacola com ${quantidadeTotal} ${
              quantidadeTotal === 1 ? "item" : "itens"
            }`}
            className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-[var(--sf-surface-2)]"
          >
            <ShoppingBag className="h-5 w-5" strokeWidth={1.75} />
            <span
              className={`absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--sf-accent)] px-1 text-[10px] font-bold text-[var(--sf-accent-ink)] transition-transform duration-200 ${
                quantidadeTotal > 0 ? "scale-100" : "scale-0"
              }`}
            >
              {quantidadeTotal}
            </span>
          </button>
        </div>
      </div>

      {busca ? (
        <div className="border-t border-[var(--sf-line)] px-4 py-3 sm:px-6">
          <div className="mx-auto max-w-[var(--sf-container)]">
            <input
              autoFocus
              placeholder="Digite sua busca aqui…"
              className="w-full rounded-[var(--sf-radius)] border border-[var(--sf-line)] px-4 py-2.5 text-[13px] outline-none focus:border-[var(--sf-accent)]"
            />
          </div>
        </div>
      ) : null}

      {/* Drawer mobile */}
      {drawer ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[82%] max-w-[320px] flex-col bg-white">
            <div className="flex h-16 items-center justify-between border-b border-[var(--sf-line)] px-4">
              <span className="text-[14px] font-semibold tracking-[.18em] uppercase">
                {marca.nome}
              </span>
              <button aria-label="Fechar menu" onClick={() => setDrawer(false)}>
                <X className="h-6 w-6" strokeWidth={1.75} />
              </button>
            </div>
            <nav className="flex flex-col px-4 py-2">
              {menu.map((item) => (
                <a
                  key={item.rotulo}
                  href={item.href}
                  onClick={() => setDrawer(false)}
                  className="border-b border-[var(--sf-line)] py-3.5 text-[14px]"
                >
                  {item.rotulo}
                </a>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}
