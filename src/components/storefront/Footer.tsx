import { Instagram, Youtube, Facebook } from "lucide-react";
import { marca, rodape } from "./brand";

export function Footer() {
  return (
    <footer className="mt-4 bg-[var(--sf-surface-2)] pt-14">
      <div className="mx-auto max-w-[var(--sf-container)] px-4 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.2fr_repeat(3,1fr)]">
          <div>
            <span className="text-[15px] font-semibold uppercase tracking-[.18em]">
              {marca.nome}
            </span>
            <p className="mt-3 max-w-[34ch] text-[12px] leading-relaxed text-[var(--sf-ink-2)]">
              {marca.tagline}
            </p>
            <div className="mt-5 flex gap-3">
              {[Instagram, Youtube, Facebook].map((Icone, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="Rede social"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--sf-line)] transition-colors hover:bg-white"
                >
                  <Icone className="h-4 w-4" strokeWidth={1.75} />
                </a>
              ))}
            </div>
          </div>

          {rodape.colunas.map((col) => (
            <div key={col.titulo}>
              <h3 className="text-[12px] font-semibold uppercase tracking-[.12em] text-[var(--sf-ink)]">
                {col.titulo}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.rotulo}>
                    <a
                      href={l.href}
                      className="text-[12px] text-[var(--sf-ink-2)] transition-colors hover:text-[var(--sf-accent)]"
                    >
                      {l.rotulo}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 border-t border-[var(--sf-line)] py-7 sm:flex-row sm:justify-between">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="mr-1 text-[11px] text-[var(--sf-muted)]">Formas de pagamento</span>
            {rodape.pagamentos.map((p) => (
              <span
                key={p}
                className="rounded border border-[var(--sf-line)] bg-white px-2.5 py-1 text-[10px] font-medium text-[var(--sf-ink-2)]"
              >
                {p}
              </span>
            ))}
          </div>
          <p className="text-center text-[11px] text-[var(--sf-muted)] sm:text-right">
            {rodape.razaoSocial}
          </p>
        </div>
      </div>
    </footer>
  );
}
