"use client";

import Image from "next/image";
import { useRef } from "react";
import styles from "./HomeCommerce.module.css";

const assets = "/sites/cafecomdeuspai-com-8456844d/root-8a5edab2";

type Product = {
  image: string;
  name: string;
  price: string;
  installment: string;
  reviews?: number;
  href?: string;
};

const launches: Product[] = [
  { image: "asset-006.webp", name: "CAFÉ COM DEUS PAI VOL.6 (BROCHURA) + A VIDA QUE VOCÊ BUSCA ESTÁ NA CURA QUE VOCÊ PRECISA", price: "R$99,90", installment: "4 de R$24,98", reviews: 1, href: "/produtos/cafe-com-deus-pai-vol-6-brochura-a-vida-que-voce-busca-esta-na-cura-que-voce-precisa/" },
  { image: "asset-007.webp", name: "CAFÉ COM DEUS PAI VOL.6 (BROCHURA) + A VIDA QUE VOCÊ BUSCA ESTÁ NA CURA QUE VOCÊ PRECISA + CANECA", price: "R$219,90", installment: "4 de R$54,98", href: "/produtos/cafe-com-deus-pai-vol-6-brochura-a-vida-que-voce-busca-esta-na-cura-que-voce-precisa-caneca/" },
  { image: "asset-008.webp", name: "2 CANECAS CAFÉ COM DEUS PAI (VOL.6)", price: "R$199,90", installment: "4 de R$49,98", href: "/produtos/2-canecas-cafe-com-deus-pai-vol-6/" },
  { image: "asset-009.webp", name: "A VIDA QUE VOCÊ BUSCA ESTÁ NA CURA QUE VOCÊ PRECISA + LATA ALFAJOR VELUTTI COM 6 UN + MARCA-TEXTO", price: "R$149,90", installment: "4 de R$37,48", href: "/produtos/a-vida-que-voce-busca-esta-na-cura-que-voce-precisa-lata-alfajor-velutti-com-6-un-marca-texto/" },
];

const featured: Product[] = [
  { image: "asset-012.webp", name: "A VIDA QUE VOCÊ BUSCA ESTÁ NA CURA QUE VOCÊ PRECISA + PLANNER + MARCA-TEXTO", price: "R$129,90", installment: "4 de R$32,48", href: "/produtos/a-vida-que-voce-busca-esta-na-cura-que-voce-precisa-planner-marca-texto/" },
  { image: "asset-013.webp", name: "PLANNER CAFÉ COM DEUS PAI", price: "R$59,90", installment: "4 de R$14,98", href: "/produtos/planner-cafe-com-deus-pai-2025/" },
  { image: "asset-014.webp", name: "A VIDA QUE VOCÊ BUSCA ESTÁ NA CURA QUE VOCÊ PRECISA + CAFÉ COM DEUS PAI (BROCHURA) VOL.6 + PLANNER", price: "R$179,90", installment: "4 de R$44,98", href: "/produtos/a-vida-que-voce-busca-esta-na-cura-que-voce-precisa-cafe-com-deus-pai-brochura-vol-6-planner/" },
  { image: "asset-015.webp", name: "2 LIVROS CAFÉ COM DEUS PAI VOL. 6 (BROCHURA) + 2 CANECAS", price: "R$289,90", installment: "4 de R$72,48", href: "/produtos/2-livros-cafe-com-deus-pai-vol-6-brochura-2-canecas/" },
];

const unmissable: Product[] = [
  { image: "asset-017.webp", name: "COMBO: CAFÉ COM DEUS PAI VOL.6 (BROCHURA) + LATA DE CAFÉ GOURMET", price: "R$108,90", installment: "4 de R$27,23", href: "/produtos/combo-cafe-com-deus-pai-vol-6-brochura-lata-de-cafe-gourmet/" },
  { image: "asset-018.webp", name: "COMBO CAFÉ COM DEUS PAI VOL.6 (BROCHURA) + ECOBAG + COPO (250ML)", price: "R$99,90", installment: "4 de R$24,98", reviews: 3, href: "/produtos/combo-cafe-com-deus-pai-2026-brochura-ecobag-copo-250ml/" },
  { image: "asset-019.webp", name: "CAFÉ COM DEUS PAI VOL.6 (BROCHURA) + 10 FILTROS INDIVIDUAIS", price: "R$78,90", installment: "4 de R$19,73", reviews: 2, href: "/produtos/cafe-com-deus-pai-2026-brochura-10-filtros-individuais/" },
];

function Chevron({ direction }: { direction: "left" | "right" }) {
  return <span aria-hidden="true">{direction === "left" ? "‹" : "›"}</span>;
}

function ProductRail({ title, products, subdued = false }: { title: string; products: Product[]; subdued?: boolean }) {
  const rail = useRef<HTMLDivElement>(null);
  const move = (direction: number) => rail.current?.scrollBy({ left: direction * Math.max(280, rail.current.clientWidth * 0.78), behavior: "smooth" });

  return (
    <section className={`${styles.products} ${subdued ? styles.subdued : ""}`}>
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
            <a className={styles.card} href={product.href ?? "#"} key={product.image}>
              <div className={styles.imageWrap}>
                <Image src={`${assets}/${product.image}`} alt={product.name} fill sizes="(max-width: 600px) 72vw, 25vw" />
              </div>
              <div className={styles.cardBody}>
                <h3>{product.name}</h3>
                <strong>{product.price}</strong>
                <span>{product.installment}</span>
                {product.reviews ? <small><b>★★★★★</b> ({product.reviews})</small> : null}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomeCommerce() {
  return (
    <div className={styles.commerce}>
      <ProductRail title="LANÇAMENTO" products={launches} />

      <section className={styles.banners} aria-label="Destaques da loja">
        <div className={styles.bannerGrid}>
          <a href="/produtos/combo-plus/" aria-label="Conheça o Combo Plus"><Image src={`${assets}/asset-010.webp`} alt="Combo Plus Café com Deus Pai" fill sizes="(max-width: 720px) 100vw, 50vw" /></a>
          <a href="#lancamentos" aria-label="Confira os lançamentos"><Image src={`${assets}/asset-011.webp`} alt="Lançamentos Café com Deus Pai" fill sizes="(max-width: 720px) 100vw, 50vw" /></a>
        </div>
      </section>

      <ProductRail title="DESTAQUES" products={featured} />

      <section className={styles.author}>
        <div className={styles.authorInner}>
          <div className={styles.portrait}><Image src={`${assets}/asset-020.webp`} alt="Junior Rostirola, autor de Café com Deus Pai" fill sizes="(max-width: 720px) 100vw, 42vw" /></div>
          <div className={styles.authorCopy}>
            <span>SOBRE O AUTOR</span>
            <h2>Junior Rostirola</h2>
            <p>Junior Rostirola é pastor, escritor e idealizador do movimento Café com Deus Pai. Sua história de superação, marcada por uma infância difícil e pelo encontro com a fé, inspira milhões de pessoas todos os dias.</p>
            <p>Autor do best-seller Café com Deus Pai, Junior compartilha mensagens simples e profundas que aproximam as pessoas de Deus e transformam o momento do café em um encontro diário de amor, esperança e propósito.</p>
            <a href="/sobre/">Conheça sua história</a>
          </div>
        </div>
      </section>

      <ProductRail title="IMPERDÍVEL" products={unmissable} subdued />
    </div>
  );
}
