"use client";

import { getImageProps } from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { BadgeCheck, CreditCard, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/HeaderFooter";
import styles from "./HomeHero.module.css";

const assetRoot = "/sites/cafecomdeuspai-com-8456844d/root-8a5edab2";
const HomeVideoStories = dynamic(() => import("./HomeVideoStories"), { ssr: false });

const slides = [
  {
    desktopImage: `${assetRoot}/hero-desktop-v4.webp`,
    mobileImage: `${assetRoot}/hero-mobile-v4.webp`,
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
  const [heroPronto, setHeroPronto] = useState(false);
  // O preload pode terminar antes da hidratação e do registro de onLoad.
  const registrarImagem = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete) setHeroPronto(true);
  }, []);
  const slide = slides[0];
  const comum = { alt: slide.alt, sizes: "100vw", fetchPriority: "high" as const, loading: "eager" as const };
  // Arquivos já comprimidos: sem processamento nem novas variantes no VPS.
  const { props: imagem } = getImageProps({
    ...comum, src: slide.mobileImage, width: 375, height: 611, unoptimized: true,
  });

  return (
    <>
      <SiteHeader cartCount={cartCount} onCartClick={onCartClick} transparente />
      <section className={styles.hero} aria-label="Destaque Café com Deus Pai">
        <div className={styles.track}>
            <article className={styles.slide}>
              <picture>
                <source media="(min-width: 641px)" type="image/avif" srcSet={`${assetRoot}/hero-desktop-v4.avif`} width={1580} height={600} />
                <source media="(max-width: 640px)" type="image/avif" srcSet={`${assetRoot}/hero-mobile-v4.avif`} width={375} height={611} />
                <source media="(min-width: 641px)" type="image/webp" srcSet={slide.desktopImage} width={1580} height={600} />
                <img {...imagem} ref={registrarImagem} alt={slide.alt} className={styles.image} onLoad={() => setHeroPronto(true)} onError={() => setHeroPronto(true)} />
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
        {/* O vídeo de prévia não disputa rede/CPU com a imagem principal. */}
        {heroPronto && <HomeVideoStories floating />}
      </section>
      <section className={styles.trustBar} aria-label="Vantagens da loja">
        <div className={styles.trustInner}>
          <div className={styles.trustItem}><ShieldCheck aria-hidden="true" /><strong>Compra 100% segura</strong></div>
          <div className={styles.trustItem}><BadgeCheck aria-hidden="true" /><strong>Loja oficial</strong></div>
          <div className={styles.trustItem}><CreditCard aria-hidden="true" /><strong>Em até 4x sem juros no cartão</strong></div>
        </div>
      </section>
    </>
  );
}
