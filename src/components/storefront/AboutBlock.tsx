import { Placeholder } from "./Placeholder";

export function AboutBlock() {
  return (
    <section className="py-14 sm:py-20">
      <div className="mx-auto grid max-w-[var(--sf-container)] items-center gap-10 px-4 sm:px-6 md:grid-cols-2 md:gap-16">
        <Placeholder
          ratio="1 / 1"
          rotulo="Foto"
          className="mx-auto w-full max-w-[380px] rounded-full"
        />

        <div>
          <h2 className="text-[13px] font-semibold uppercase tracking-[.18em] text-[var(--sf-ink)]">
            Sobre a marca
          </h2>
          <p className="mt-5 text-[14px] leading-relaxed text-[var(--sf-ink-2)]">
            Primeiro parágrafo sobre quem está por trás da loja — origem, propósito
            e o que diferencia o produto. Duas a três linhas funcionam melhor aqui.
          </p>
          <p className="mt-4 text-[14px] leading-relaxed text-[var(--sf-ink-2)]">
            Segundo parágrafo com prova social real: números que você pode comprovar,
            imprensa, prêmios ou tempo de mercado.
          </p>
          <a
            href="/sobre"
            className="mt-7 inline-block rounded-[var(--sf-radius)] border border-[var(--sf-ink)] px-7 py-2.5 text-[13px] font-medium transition-colors hover:bg-[var(--sf-ink)] hover:text-white"
          >
            Conheça a história
          </a>
        </div>
      </div>
    </section>
  );
}
