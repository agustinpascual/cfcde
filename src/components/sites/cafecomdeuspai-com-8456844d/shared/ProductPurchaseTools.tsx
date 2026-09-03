"use client";

import { FormEvent, useState } from "react";
import styles from "./ProductPurchaseTools.module.css";

export type ProductPurchaseProps = {
  name: string;
  price: string;
  originalPrice?: string | null;
  installment: string;
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
  onBuy: () => void;
};

type ShippingResult =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; pac: string; sedex: string };

function deliveryDate(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

export function ShippingCalculator() {
  const [postalCode, setPostalCode] = useState("");
  const [result, setResult] = useState<ShippingResult>({ status: "idle" });

  function calculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const digits = postalCode.replace(/\D/g, "");

    if (digits.length !== 8) {
      setResult({ status: "error", message: "Digite um CEP válido com 8 números." });
      return;
    }

    setResult({
      status: "success",
      pac: deliveryDate(25),
      sedex: deliveryDate(13),
    });
  }

  function updatePostalCode(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    setPostalCode(digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits);
    if (result.status !== "idle") setResult({ status: "idle" });
  }

  return (
    <section className={styles.shipping} aria-labelledby="shipping-title">
      <form onSubmit={calculate} noValidate>
        <label id="shipping-title" htmlFor="shipping-postal-code">Calcular frete</label>
        <div className={styles.shippingControls}>
          <input
            id="shipping-postal-code"
            value={postalCode}
            onChange={(event) => updatePostalCode(event.target.value)}
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="CEP"
            aria-describedby="shipping-feedback"
          />
          <button type="submit">Calcular</button>
        </div>
      </form>

      <div id="shipping-feedback" className={styles.feedback} aria-live="polite">
        {result.status === "error" ? <p className={styles.error}>{result.message}</p> : null}
        {result.status === "success" ? (
          <div className={styles.shippingResult}>
            <strong>Sucesso! Você tem frete grátis</strong>
            <p><span>Correios - PAC</span><time dateTime={result.pac}>Entrega prevista: {result.pac}</time></p>
            <p><span>Correios - SEDEX</span><time dateTime={result.sedex}>Entrega prevista: {result.sedex}</time></p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function MobilePurchaseBar({
  name,
  price,
  originalPrice,
  installment,
  quantity,
  onDecrease,
  onIncrease,
  onBuy,
}: ProductPurchaseProps) {
  return (
    <aside className={styles.purchaseBar} aria-label="Comprar produto">
      <div className={styles.purchaseInfo}>
        <p className={styles.productName}>{name}</p>
        <div className={styles.priceLine}>
          {originalPrice ? <del>{originalPrice}</del> : null}
          <strong>{price}</strong>
          <span>{installment}</span>
        </div>
        <small>Frete grátis</small>
      </div>
      <div className={styles.purchaseActions}>
        <div className={styles.stepper} aria-label="Quantidade">
          <button type="button" onClick={onDecrease} disabled={quantity <= 1} aria-label="Diminuir quantidade">−</button>
          <output aria-live="polite" aria-label={`${quantity} unidades`}>{quantity}</output>
          <button type="button" onClick={onIncrease} aria-label="Aumentar quantidade">+</button>
        </div>
        <button className={styles.buyButton} type="button" onClick={onBuy}>Comprar</button>
      </div>
    </aside>
  );
}
