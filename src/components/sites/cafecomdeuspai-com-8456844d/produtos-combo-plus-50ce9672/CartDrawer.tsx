"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { calcularDescontosCarrinho, cupomValidoCarrinho } from "@/lib/promocoes";
import type { useCart } from "@/components/sites/cafecomdeuspai-com-8456844d/useCart";
import styles from "./CartDrawer.module.css";

type Cart = ReturnType<typeof useCart>;
type Props = { open: boolean; onClose: () => void; cart: Cart };
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const CHAVE_CUPOM = "cdp-cupom";

export default function CartDrawer({ open, onClose, cart }: Props) {
  const wasOpen = useRef(false);
  const [coupon, setCoupon] = useState("");
  const [couponStatus, setCouponStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [cupomAplicado, setCupomAplicado] = useState("");

  useEffect(() => {
    if (open && !wasOpen.current) setCouponStatus("idle");
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", escape);
    };
  }, [open, onClose]);

  function apply() {
    const codigo = coupon.trim().toUpperCase();
    if (!cupomValidoCarrinho(codigo, cart.items.map((item) => item.slug))) {
      setCupomAplicado("");
      setCouponStatus("invalid");
      try { localStorage.removeItem(CHAVE_CUPOM); } catch {}
      return;
    }
    setCupomAplicado(codigo);
    setCoupon(codigo);
    setCouponStatus("valid");
    try { localStorage.setItem(CHAVE_CUPOM, codigo); } catch {}
  }

  const descontos = calcularDescontosCarrinho({
    itens: cart.items.map((item) => ({ produtoSlug: item.slug, subtotalCentavos: item.priceCents * item.quantity })),
    cupom: cupomAplicado,
  });
  const total = cart.subtotalCents - descontos.cupomCentavos;
  const itensCheckout = cart.items.map((item) => `${item.slug}:${item.quantity}`).join(",");
  const checkoutHref = `/checkout?itens=${encodeURIComponent(itensCheckout)}${cupomAplicado ? `&cupom=${encodeURIComponent(cupomAplicado)}` : ""}`;

  return <div className={`${styles.root} ${open ? styles.open : ""}`} aria-hidden={!open}>
    <button className={styles.overlay} type="button" aria-label="Fechar carrinho" tabIndex={open ? 0 : -1} onClick={onClose} />
    <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="cart-title">
      <header className={styles.header}><ShoppingBag className={styles.bag} aria-hidden="true" strokeWidth={1.5} /><h2 id="cart-title">Sua sacola</h2><button className={styles.iconButton} type="button" onClick={onClose} aria-label="Fechar carrinho"><X aria-hidden="true" strokeWidth={1.5} /></button></header>
      <div className={styles.content}>{cart.items.length ? <div className={styles.productList}>
        {cart.items.map((item) => <article className={styles.product} key={item.slug}>
          <div className={styles.imageWrap}><Image src={item.image} alt={item.name} fill sizes="200px" /></div>
          <div className={styles.productInfo}><h3>{item.name}</h3><p>{money.format(item.priceCents / 100)}</p><div className={styles.quantityRow}><label>Quantidade:</label><div className={styles.stepper} aria-label={`Quantidade de ${item.name}`}><button type="button" aria-label={item.quantity === 1 ? `Remover ${item.name}` : `Diminuir ${item.name}`} onClick={() => cart.changeQuantity(item.slug, item.quantity - 1)}><Minus aria-hidden="true" /></button><span aria-live="polite">{item.quantity}</span><button type="button" aria-label={`Aumentar ${item.name}`} onClick={() => cart.changeQuantity(item.slug, item.quantity + 1)}><Plus aria-hidden="true" /></button></div></div></div>
          <button className={styles.remove} type="button" onClick={() => cart.remove(item.slug)} aria-label={`Remover ${item.name}`}><Trash2 aria-hidden="true" strokeWidth={1.5} /></button>
        </article>)}
      </div> : <div className={styles.empty}><ShoppingBag aria-hidden="true" strokeWidth={1.3} /><h3>Sua sacola está vazia</h3><p>Adicione produtos para continuar sua compra.</p></div>}</div>
      <footer className={styles.footer}><div className={styles.summary}><span>Sub-total:</span><strong>{money.format(cart.subtotalCents / 100)}</strong></div>
        <div className={styles.coupon}><label htmlFor="cart-coupon">CUPOM DE DESCONTO</label><div><input id="cart-coupon" value={coupon} onChange={event => { setCoupon(event.target.value); setCouponStatus("idle"); }} placeholder="Digite seu Cupom" /><button type="button" onClick={apply}>Aplicar</button></div>{couponStatus !== "idle" && <p className={couponStatus === "valid" ? styles.success : styles.error} role="status">{couponStatus === "valid" ? `Cupom ${cupomAplicado} aplicado!` : "Cupom inválido para os produtos da sacola."}</p>}</div>
        {descontos.cupomAplicado && <div className={styles.summary}><span>Cupom {descontos.cupomAplicado}:</span><strong>− {money.format(descontos.cupomCentavos / 100)}</strong></div>}
        <div className={styles.total}><span>Total:</span><strong>{money.format(total / 100)}</strong></div>
        {cart.items.length ? <Link href={checkoutHref} className={styles.checkout}>Finalizar compra</Link> : <span className={`${styles.checkout} ${styles.disabled}`}>Finalizar compra</span>}
        <button className={styles.continue} type="button" onClick={onClose}>Continuar comprando</button>
      </footer>
    </aside>
  </div>;
}
