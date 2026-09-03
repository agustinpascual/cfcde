"use client";

import { TriangleAlert } from "lucide-react";
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

type Entrega = { label: string; iso: string };

type ShippingResult =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; postalCode: string; pac: Entrega; sedex: Entrega };

const LAST_CEP_KEY = "cdp-last-shipping-cep";
const PAC_DIAS = 25;
const SEDEX_DIAS = 13;

function entrega(dias: number): Entrega {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + dias);
  return { label: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date), iso: date.toISOString().slice(0, 10) };
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

    try { localStorage.setItem(LAST_CEP_KEY, digits); } catch {}

    setResult({
      status: "success",
      postalCode: digits,
      pac: entrega(PAC_DIAS),
      sedex: entrega(SEDEX_DIAS),
    });
  }

  function updatePostalCode(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    setPostalCode(digits);
    if (result.status !== "idle") setResult({ status: "idle" });
  }

  if (result.status === "success") {
    return <section className={`${styles.shipping} ${styles.shippingResult}`} aria-labelledby="shipping-result-title">
      <div className={styles.resultHeader}><p id="shipping-result-title">Entregas para o CEP: <b>{result.postalCode}</b></p><button type="button" onClick={() => setResult({ status: "idle" })}>Alterar CEP</button></div>
      <div className={styles.resultTracking}><TriangleAlert aria-hidden="true" /><span>O código de rastreio do seu pedido estará disponível em até 5 dias úteis na área do cliente em &quot;Detalhes do pedido&quot; &quot;Entrega&quot;</span></div>
      <p className={styles.resultScope}>Envio a domicílio</p>
      <ul className={styles.resultOptions}>
        <li><span><b>Correios - PAC</b><small>Chega {result.pac.label}</small></span><strong>Grátis <s>R$20,32</s></strong></li>
        <li><span><b>Correios - SEDEX</b><small>Chega {result.sedex.label}</small></span><strong>R$20,32</strong></li>
      </ul>
      <p className={styles.resultHoliday}>O prazo de entrega <b>não contabiliza feriados.</b></p>
      <p className={styles.resultSuccess}>Sucesso! Você tem frete grátis</p>
    </section>;
  }

  return (
    <section className={`${styles.shipping} ${styles.shippingCompact}`} aria-labelledby="shipping-title">
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
          <span>{installment.replace(/^4 de /, "4 x de ")}</span>
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
