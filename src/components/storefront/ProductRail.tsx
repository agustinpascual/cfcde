"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Placeholder } from "./Placeholder";
import { useCarrinho } from "./CartContext";
import { brl } from "./format";
import type { Produto } from "./brand";

export function ProductRail({
  id,
  titulo,
  produtos,
}: {
  id: string;
  titulo: string;
  produtos: Produto[];
}) {
  const trilho = useRef<HTMLDivElement>(null);
  const { adicionar } = useCarrinho();

  const rolar = (dir: 1 | -1) => {
    const el = trilho.current;
    if (!el) return;
    /* rola aproximadamente um card por clique */
    el.scrollBy({ left: dir * (el.clientWidth / 2), behavior: "smooth" });
  };

  return (
    <section id={id} className="py-12 sm:py-16">
      <div className="mx-auto max-w-[var(--sf-container)] px-4 sm:px-6">
        <h2 className="mb-6 text-center text-[11px] font-semibold uppercase tracking-[.2em] text-[var(--sf-muted)]">
          {titulo}
        </h2>

        <div className="relative">
          <div
            ref={trilho}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {produtos.map((p) => (
              <article
                key={p.id}
                className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-[23.5%]"
              >
                <div className="relative overflow-hidden rounded-[var(--sf-radius)] border border-[var(--sf-line)]">
                  {p.selo ? (
                    <span className="absolute top-2 left-2 z-10 rounded bg-[var(--sf-accent)] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-[var(--sf-accent-ink)]">
                      {p.selo}
                    </span>
                  ) : null}
                  <Placeholder ratio="1 / 1" rotulo="Foto do produto" />
                </div>

                <h3 className="mt-3 line-clamp-2 text-[12px] leading-snug text-[var(--sf-ink-2)] uppercase">
                  {p.nome}
                </h3>

                <div className="mt-2 flex items-baseline gap-2">
                  {p.precoDe ? (
                    <span className="text-[11px] text-[var(--sf-muted)] line-through">
                      {brl(p.precoDe)}
                    </span>
                  ) : null}
                  <span className="text-[15px] font-semibold text-[var(--sf-ink)]">
                    {brl(p.preco)}
                  </span>
                </div>
                {p.parcelas ? (
                  <p className="mt-0.5 text-[11px] text-[var(--sf-muted)]">{p.parcelas}</p>
                ) : null}

                <button
                  onClick={() => adicionar(p)}
                  className="mt-2.5 w-full rounded-[var(--sf-radius)] border border-[var(--sf-ink)] py-2 text-[12px] font-medium transition-colors hover:bg-[var(--sf-ink)] hover:text-white"
                >
                  Adicionar
                </button>
              </article>
            ))}
          </div>

          <button
            aria-label="Anterior"
            onClick={() => rolar(-1)}
            className="absolute top-[38%] -left-2 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--sf-line)] bg-white shadow-sm transition-colors hover:bg-[var(--sf-surface-2)]"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            aria-label="Próximo"
            onClick={() => rolar(1)}
            className="absolute top-[38%] -right-2 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--sf-line)] bg-white shadow-sm transition-colors hover:bg-[var(--sf-surface-2)]"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </section>
  );
}
