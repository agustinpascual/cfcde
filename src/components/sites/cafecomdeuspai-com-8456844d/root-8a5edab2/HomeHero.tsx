"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { SiteHeader } from "@/components/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/HeaderFooter";
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

/* Com um banner só o carrossel vira imagem fixa: sem giro automático,
   sem setas e sem bolinhas. Voltando a ter dois, tudo religa sozinho. */
const carrossel = slides.length > 1;

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
    if (paused || !carrossel) return;
    const timer = window.setInterval(() => {
      setCurrent((slide) => (slide + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [paused]);

  return (
    <>
      <SiteHeader cartCount={cartCount} onCartClick={onCartClick} transparente />
      <section
        className={styles.hero}
        aria-roledescription={carrossel ? "carrossel" : undefined}
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
                  fetchPriority={index === 0 ? "high" : undefined}
                  loading={index === 0 ? "eager" : "lazy"}
                  sizes="100vw"
                />
              </picture>
              {/* Camada escura + texto. O véu não é enfeite: sem ele o texto
                  branco fica ilegível sobre as áreas claras da foto, e a
                  legibilidade da chamada é o que faz a primeira dobra
                  funcionar. */}
              {slide.titulo || slide.button ? (
                <div className={styles.overlay}>
                  {slide.titulo ? <h2 className={styles.chamada}>{slide.titulo}</h2> : null}
                  {slide.href && slide.button ? (
                    <a
                      className={styles.conheca}
                      href={slide.href}
                      tabIndex={current === index ? 0 : -1}
                    >
                      {slide.button}
                    </a>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>

        {carrossel ? (
          <>
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
          </>
        ) : null}

      </section>
    </>
  );
}
