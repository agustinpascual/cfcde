"use client";

import Image from "next/image";
import Link from "next/link";
import { type CSSProperties, useRef } from "react";
import styles from "./HomeCommerce.module.css";
import { PRODUCTS } from "@/components/sites/cafecomdeuspai-com-8456844d/shared/productCatalog";

const assets = "/sites/cafecomdeuspai-com-8456844d/root-8a5edab2";

type Product = {
  image: string;
  name: string;
  price: string;
  installment: string;
  reviews?: number;
  href?: string;
  imageZoom?: number;
};

function Chevron({ direction }: { direction: "left" | "right" }) {
  return <span aria-hidden="true">{direction === "left" ? "‹" : "›"}</span>;
}

/* A vitrine de Lançamento junta a lista curada da home com tudo que está no
   catálogo nessa categoria. Antes eram só 4 itens fixos: a seta rolava e não
   havia mais nada para mostrar. */
const doCatalogo: Product[] = PRODUCTS
  .filter((p) => p.category === "Lançamento")
  .map((p) => ({
    image: p.image,
    name: p.name,
    price: p.price,
    installment: p.installment,
    href: `/produtos/${p.slug}`,
  }));

const lancamentos: Product[] = doCatalogo;
/* Destaques mostra somente os kits novos: todo item parte de um livro e o
   sinal de "+" identifica que há outro livro ou acessório no conjunto. */
const featured: Product[] = doCatalogo.filter((product) => product.name.includes("+"));

function ProductRail({ title, products }: { title: string; products: Product[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const move = (direction: number) => rail.current?.scrollBy({ left: direction * Math.max(280, rail.current.clientWidth * 0.78), behavior: "smooth" });

  return (
    <section className={styles.products}>
      <div className={styles.container}>
        <div className={styles.heading}>
          <h2>{title}</h2>
          <div className={styles.arrows}>
            <button type="button" onClick={() => move(-1)} aria-label={`Produtos anteriores em ${title}`}><Chevron direction="left" /></button>
            <button type="button" onClick={() => move(1)} aria-label={`Próximos produtos em ${title}`}><Chevron direction="right" /></button>
          </div>
        </div>
        <div className={styles.rail} ref={rail}>
          {products.map((product) => (
            <Link className={styles.card} href={product.href ?? "#"} key={product.image}>
              <div className={styles.imageWrap} style={{ "--product-zoom": product.imageZoom ?? 1.06 } as CSSProperties}>
                <Image src={product.image.startsWith("/") ? product.image : `${assets}/${product.image}`} alt={product.name} fill sizes="(max-width: 600px) 72vw, 25vw" />
              </div>
              <div className={styles.cardBody}>
                <h3>{product.name}</h3>
                <strong>{product.price}</strong>
                <span>{product.installment}</span>
                {product.reviews ? <small><b>★★★★★</b> ({product.reviews})</small> : null}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomeCommerce() {
  return (
    <div className={styles.commerce}>
      <ProductRail title="LANÇAMENTO" products={lancamentos} />

      <section className={styles.banners} aria-label="Destaques da loja">
        <div className={styles.bannerGrid}>
          {/* O banner é o COMBO VOLUME 7; apontar para /combo-plus levava ao combo do
              vol.6 — quem clicasse caía num produto diferente do anunciado. */}
          <Link href="/produto/box-plus2027" aria-label="Conheça o Combo Plus 2027"><Image src={`${assets}/asset-010-v3.webp`} alt="Combo Plus 2027 · Café com Deus Pai volume 7" fill sizes="(max-width: 720px) 100vw, 50vw" /></Link>
          <Link href="/categoria/lancamento" aria-label="Ver todos os lançamentos"><Image src={`${assets}/asset-011-v3.webp`} alt="Lançamentos Café com Deus Pai" fill sizes="(max-width: 720px) 100vw, 50vw" /></Link>
        </div>
      </section>

      <ProductRail title="DESTAQUES" products={featured} />

      <section className={styles.authorBanner} aria-label="Sobre o autor Junior Rostirola">
        <Image className={styles.authorDesktop} src={`${assets}/sobre-autor-desktop-v2.webp`} alt="Sobre o autor Junior Rostirola" width={1580} height={600} sizes="100vw" />
        <Image className={styles.authorMobile} src={`${assets}/sobre-autor-mobile-v2.webp`} alt="Sobre o autor Junior Rostirola" width={625} height={1020} sizes="100vw" />
      </section>
    </div>
  );
}
