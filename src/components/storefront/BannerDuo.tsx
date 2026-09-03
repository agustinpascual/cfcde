import { Placeholder } from "./Placeholder";

const banners = [
  { id: "b1", titulo: "Banner promocional 1", href: "#combos" },
  { id: "b2", titulo: "Banner promocional 2", href: "#destaques" },
];

export function BannerDuo() {
  return (
    <section id="combos" className="py-4">
      <div className="mx-auto grid max-w-[var(--sf-container)] gap-4 px-4 sm:px-6 md:grid-cols-2">
        {banners.map((b) => (
          <a
            key={b.id}
            href={b.href}
            className="group relative block overflow-hidden rounded-[var(--sf-radius)] border border-[var(--sf-line)]"
          >
            <Placeholder ratio="16 / 10" rotulo={b.titulo} />
            <span className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/[.04]" />
          </a>
        ))}
      </div>
    </section>
  );
}
