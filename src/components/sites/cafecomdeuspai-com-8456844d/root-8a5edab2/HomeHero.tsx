"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { SiteHeader } from "@/components/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/HeaderFooter";
import styles from "./HomeHero.module.css";

const assetRoot = "/sites/cafecomdeuspai-com-8456844d/root-8a5edab2";

const slides = [
  {
    desktopImage: `${assetRoot}/asset-003.webp`,
    mobileImage: `${assetRoot}/asset-005.webp`,
    alt: "Você faz parte desta história — faça parte do grupo exclusivo Café com Deus Pai",
    href: "https://chat.whatsapp.com/",
    button: "Entrar no grupo",
    kind: "exclusive",
  },
  {
    desktopImage: `${assetRoot}/asset-004.webp`,
    mobileImage: undefined,
    alt: "Livros Café com Deus Pai e A vida que você busca está na cura que você precisa",
    href: "/produtos/combo-plus/",
    button: "Conheça",
    kind: "books",
  },
] as const;

type HomeHeroProps = {
  cartCount?: number;
  onCartClick?: () => void;
};

export default function HomeHero({ cartCount = 0, onCartClick }: HomeHeroProps) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const showSlide = useCallback((index: number) => {
    setCurrent((index + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setCurrent((slide) => (slide + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [paused]);

  return (
    <>
      <SiteHeader cartCount={cartCount} onCartClick={onCartClick} />
      <section
        className={styles.hero}
        aria-roledescription="carrossel"
        aria-label="Destaques Café com Deus Pai"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div className={styles.track} style={{ transform: `translateX(-${current * 100}%)` }}>
          {slides.map((slide, index) => (
            <article
              className={styles.slide}
              key={slide.desktopImage}
              aria-hidden={current !== index}
            >
              <picture>
                {slide.mobileImage ? <source media="(max-width: 640px)" srcSet={slide.mobileImage} /> : null}
                <Image
                  className={styles.image}
                  src={slide.desktopImage}
                  alt={slide.alt}
                  width={1580}
                  height={600}
                  priority={index === 0}
                  sizes="100vw"
                />
              </picture>
              {slide.kind === "books" ? (
                <div className={`${styles.caption} ${styles.booksCaption}`}>
                  <h2>Sim, Deus deseja tomar café<br />com você</h2>
                  <a href={slide.href} tabIndex={current === index ? 0 : -1}>{slide.button}</a>
                </div>
              ) : (
                <a
                  className={`${styles.cta} ${styles.exclusiveCta}`}
                  href={slide.href}
                  target="_blank"
                  rel="noreferrer"
                  tabIndex={current === index ? 0 : -1}
                >
                  {slide.button}
                </a>
              )}
            </article>
          ))}
        </div>

        <button className={`${styles.arrow} ${styles.previous}`} type="button" aria-label="Banner anterior" onClick={() => showSlide(current - 1)}>
          <ChevronLeft aria-hidden="true" />
        </button>
        <button className={`${styles.arrow} ${styles.next}`} type="button" aria-label="Próximo banner" onClick={() => showSlide(current + 1)}>
          <ChevronRight aria-hidden="true" />
        </button>

        <div className={styles.dots} role="group" aria-label="Escolher banner">
          {slides.map((slide, index) => (
            <button
              key={slide.desktopImage}
              className={index === current ? styles.activeDot : ""}
              type="button"
              aria-label={`Mostrar banner ${index + 1}`}
              aria-current={index === current ? "true" : undefined}
              onClick={() => showSlide(index)}
            />
          ))}
        </div>
      </section>
    </>
  );
}
