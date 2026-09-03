import { Placeholder } from "./Placeholder";

const itens = ["m1", "m2", "m3", "m4", "m5"];

export function MediaGrid() {
  return (
    <section className="py-14 sm:py-16">
      <div className="mx-auto max-w-[var(--sf-container)] px-4 sm:px-6">
        <h2 className="mb-7 text-center text-[18px] font-semibold text-[var(--sf-ink)] sm:text-[22px]">
          Veja cada detalhe em vídeo
        </h2>

        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {itens.map((id, idx) => (
            <div
              key={id}
              className="w-[58%] shrink-0 snap-start sm:w-[38%] lg:w-[19%]"
            >
              <Placeholder
                ratio="9 / 16"
                rotulo={`Vídeo ${idx + 1}`}
                className="rounded-[var(--sf-radius)] border border-[var(--sf-line)]"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
