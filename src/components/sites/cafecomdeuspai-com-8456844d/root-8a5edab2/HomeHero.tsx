"use client";

import { getImageProps } from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/HeaderFooter";
import HomeVideoStories from "./HomeVideoStories";
import styles from "./HomeHero.module.css";

const assetRoot = "/sites/cafecomdeuspai-com-8456844d/root-8a5edab2";

const slides = [
  {
    desktopImage: `${assetRoot}/asset-003-v3.webp`,
    mobileImage: `${assetRoot}/asset-005-v3.webp`,
    alt: "Você faz parte desta história — faça parte do grupo exclusivo Café com Deus Pai",
    titulo: "Sim, Deus deseja tomar café com você",
    href: "/produto/box-plus2027" as string | null,
    button: "Conheça" as string | null,
  },
];

type HomeHeroProps = {
  cartCount?: number;
  onCartClick?: () => void;
};

export default function HomeHero({ cartCount = 0, onCartClick }: HomeHeroProps) {
  const slide = slides[0];
  const comum = { alt: slide.alt, sizes: "100vw", fetchPriority: "high" as const, loading: "eager" as const };
  const { props: { srcSet: desktopSrcSet } } = getImageProps({
    ...comum, src: slide.desktopImage, width: 1580, height: 600, quality: 75,
  });
  const { props: { srcSet: mobileSrcSet, ...imagem } } = getImageProps({
    ...comum, src: slide.mobileImage, width: 375, height: 611, quality: 70,
  });

  return (
    <>
      <SiteHeader cartCount={cartCount} onCartClick={onCartClick} transparente />
      <section className={styles.hero} aria-label="Destaque Café com Deus Pai">
        <div className={styles.track}>
            <article className={styles.slide}>
              <picture>
                <source media="(min-width: 641px)" srcSet={desktopSrcSet} />
                <source media="(max-width: 640px)" srcSet={mobileSrcSet} />
                <img {...imagem} alt={slide.alt} className={styles.image} />
              </picture>
              {/* Camada escura + texto. O véu não é enfeite: sem ele o texto
                  branco fica ilegível sobre as áreas claras da foto, e a
                  legibilidade da chamada é o que faz a primeira dobra
                  funcionar. */}
              {slide.titulo || slide.button ? (
                <div className={styles.overlay}>
                  {slide.titulo ? <h2 className={styles.chamada}>{slide.titulo}</h2> : null}
                  {slide.href && slide.button ? (
                    <Link
                      className={styles.conheca}
                      href={slide.href}
                    >
                      {slide.button}
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </article>
        </div>
        <HomeVideoStories floating />
      </section>
    </>
  );
}
