"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Minus, Plus, Star, Truck } from "lucide-react";
import { useState } from "react";
import { useCartQuantity } from "../useCart";
import CartDrawer from "../produtos-combo-plus-50ce9672/CartDrawer";
import { SiteFooter, SiteHeader } from "../produtos-combo-plus-50ce9672/HeaderFooter";
import type { CatalogProduct } from "../shared/productCatalog";
import { PRODUCTS } from "../shared/productCatalog";
import { MobilePurchaseBar, ShippingCalculator } from "../shared/ProductPurchaseTools";
import styles from "./CatalogProductStore.module.css";

type Props = { product: CatalogProduct };

export default function CatalogProductStore({ product }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartQuantity, setCartQuantity] = useCartQuantity();
  const recommendations = PRODUCTS.filter((item) => item.slug !== product.slug).slice(0, 4);

  function buy() {
    setCartQuantity(quantity);
    setCartOpen(true);
  }

  return (
    <div className={styles.store}>
      <SiteHeader cartCount={cartQuantity} onCartClick={() => setCartOpen(true)} />
      <main>
        <div className={styles.productTop}><Link className={styles.back} href="/">← Voltar</Link></div>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link><span>|</span><span>{product.category}</span><span>|</span><strong>{product.name}</strong>
        </nav>

        <section className={styles.product}>
          <div className={styles.gallery}>
            <div className={styles.imageWrap}>
              <Image src={product.image} alt={product.name} fill priority sizes="(max-width: 768px) 100vw, 55vw" />
            </div>
            <ShippingCalculator />
          </div>
          <div className={styles.info}>
            <span className={styles.category}>{product.category}</span>
            <h1>{product.name}</h1>
            <div className={styles.rating} aria-label="5 de 5 estrelas"><span>5.0</span>{Array.from({ length: 5 }).map((_, i) => <Star key={i} fill="currentColor" />)}<a href="#avaliacoes">(12 avaliações)</a></div>
            {product.originalPrice ? <p className={styles.oldPrice}>{product.originalPrice}</p> : null}
            <p className={styles.price}>{product.price}</p>
            <p className={styles.installment}>{product.installment.replace(/^4 de /, "4 x de ")}</p>
            <div className={styles.shipping}><Truck /><span><strong>Frete grátis por tempo limitado</strong><br />Consulte o prazo informando seu CEP no carrinho.</span></div>
            <div className={styles.purchase}>
              <div className={styles.stepper} aria-label="Quantidade">
                <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Diminuir quantidade"><Minus /></button>
                <span aria-live="polite">{quantity}</span>
                <button type="button" onClick={() => setQuantity((value) => value + 1)} aria-label="Aumentar quantidade"><Plus /></button>
              </div>
              <button className={styles.buy} type="button" onClick={buy}>Comprar</button>
            </div>
            <p className={styles.sku}>SKU: {product.sku}</p>
          </div>
        </section>

        <section className={styles.details}>
          <details open><summary>Descrição <ChevronDown /></summary><div><p>{product.description}</p><p>Um produto criado para tornar seus momentos de fé ainda mais especiais, com acabamento cuidadoso e a identidade Café com Deus Pai.</p></div></details>
          <details><summary>Informações do produto <ChevronDown /></summary><div><p>Produto original Café com Deus Pai. As cores podem apresentar pequenas variações conforme a tela.</p></div></details>
        </section>

        <section className={styles.reviews} id="avaliacoes">
          <div><span className={styles.score}>5.0</span><div className={styles.reviewStars}>{Array.from({ length: 5 }).map((_, i) => <Star key={i} fill="currentColor" />)}</div><small>Baseado em 12 avaliações</small></div>
          <div className={styles.reviewText}><h2>Quem comprou, recomenda</h2><p>“Produto maravilhoso, chegou muito bem embalado e é ainda mais bonito pessoalmente.”</p><strong>Mariana S. — compra verificada</strong></div>
        </section>

        {recommendations.length ? <section className={styles.recommendations}><h2>Você também pode gostar</h2><div className={styles.grid}>{recommendations.map((item) => <Link href={`/produtos/${item.slug}/`} key={item.slug} className={styles.card}><div><Image src={item.image} alt={item.name} fill sizes="(max-width: 768px) 48vw, 280px" /></div><span>{item.category}</span><h3>{item.name}</h3>{item.originalPrice ? <del>{item.originalPrice}</del> : null}<strong>{item.price}</strong><small>{item.installment.replace(/^4 de /, "4 x de ")}</small></Link>)}</div></section> : null}
      </main>
      <SiteFooter />
      <MobilePurchaseBar name={product.name} price={product.price} originalPrice={product.originalPrice} installment={product.installment} quantity={quantity} onDecrease={() => setQuantity(value => Math.max(1, value - 1))} onIncrease={() => setQuantity(value => value + 1)} onBuy={buy} />
      <CartDrawer open={cartOpen} quantity={Math.max(1, cartQuantity)} onClose={() => setCartOpen(false)} onQuantityChange={setCartQuantity} productName={product.name} productImage={product.image} unitPrice={product.priceCents / 100} productSlug={product.slug} />
    </div>
  );
}
