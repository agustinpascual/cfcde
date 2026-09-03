"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { heroSlides } from "./brand";

const INTERVALO = 6000;

export function HeroCarousel() {
  const [i, setI] = useState(0);
  const [pausado, setPausado] = useState(false);
  const total = heroSlides.length;

  useEffect(() => {
    if (pausado || total < 2) return;
    const t = setInterval(() => setI((v) => (v + 1) % total), INTERVALO);
    return () => clearInterval(t);
  }, [pausado, total]);

  const ir = (n: number) => setI((n + total) % total);

  return (
    <section
      className="relative overflow-hidden bg-[var(--sf-surface-2)]"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <div className="relative h-[380px] sm:h-[460px] lg:h-[540px]">
        {heroSlides.map((s, idx) => (
          <div
            key={s.id}
            className={`absolute inset-0 transition-opacity duration-700 ${
              idx === i ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, transparent 0 14px, rgba(0,0,0,.02) 14px 28px)",
            }}
          >
            <div className="mx-auto flex h-full max-w-[var(--sf-container)] flex-col items-center justify-center px-6 text-center">
              <span className="mb-3 text-[10px] uppercase tracking-[.18em] text-[var(--sf-muted)]">
                Imagem do banner {idx + 1}
              </span>
              <h2 className="max-w-[18ch] text-[26px] leading-tight font-semibold text-[var(--sf-ink)] sm:text-[36px] lg:text-[44px]">
                {s.titulo}
              </h2>
              <p className="mt-3 max-w-[42ch] text-[14px] text-[var(--sf-ink-2)]">{s.texto}</p>
              <a
                href={s.href}
                className="mt-7 rounded-[var(--sf-radius)] bg-[var(--sf-ink)] px-8 py-3 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
              >
                {s.cta}
              </a>
            </div>
          </div>
        ))}
      </div>

      {total > 1 ? (
        <>
          <button
            aria-label="Anterior"
            onClick={() => ir(i - 1)}
            className="absolute top-1/2 left-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 transition-colors hover:bg-white"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <button
            aria-label="Próximo"
            onClick={() => ir(i + 1)}
            className="absolute top-1/2 right-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 transition-colors hover:bg-white"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={1.75} />
          </button>

          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
            {heroSlides.map((s, idx) => (
              <button
                key={s.id}
                aria-label={`Ir para o banner ${idx + 1}`}
                onClick={() => ir(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === i ? "w-6 bg-[var(--sf-ink)]" : "w-1.5 bg-[var(--sf-muted)]"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
