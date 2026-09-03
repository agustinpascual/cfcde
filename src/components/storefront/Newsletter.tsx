export function Newsletter() {
  return (
    <section className="bg-[var(--sf-surface-2)] py-14 sm:py-16">
      <div className="mx-auto max-w-[var(--sf-container)] px-4 text-center sm:px-6">
        <h2 className="text-[20px] font-semibold text-[var(--sf-ink)] sm:text-[24px]">
          Quer receber novidades?
        </h2>
        <p className="mx-auto mt-2 max-w-[52ch] text-[13px] text-[var(--sf-ink-2)]">
          Cadastre-se e receba novidades e ofertas por e-mail.
        </p>

        {/* Sem action ainda — plugue no endpoint de captação quando definir. */}
        <form className="mx-auto mt-7 flex max-w-[760px] flex-col gap-3 sm:flex-row">
          <input
            name="nome"
            placeholder="Digite seu nome aqui"
            className="flex-1 rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-white px-4 py-3 text-[13px] outline-none focus:border-[var(--sf-accent)]"
          />
          <input
            name="email"
            type="email"
            placeholder="Digite seu e-mail aqui"
            className="flex-1 rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-white px-4 py-3 text-[13px] outline-none focus:border-[var(--sf-accent)]"
          />
          <button
            type="submit"
            className="rounded-[var(--sf-radius)] bg-[var(--sf-ink)] px-8 py-3 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
          >
            Cadastrar
          </button>
        </form>
      </div>
    </section>
  );
}
