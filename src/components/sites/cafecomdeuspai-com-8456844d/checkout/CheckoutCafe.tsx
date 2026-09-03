"use client";

import Image from "next/image";
import { Check, ChevronDown, CreditCard, Truck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import styles from "./CheckoutCafe.module.css";

const productImage = "/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/combo-main.webp";
const logo = "/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/logo.png";

type Address = {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

const emptyAddress: Address = { street: "", number: "", complement: "", neighborhood: "", city: "", state: "" };

function formatDocument(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) return digits.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  return digits.replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{4})$/, "$1-$2").replace(/(\d{4})(\d{4})$/, "$1-$2");
}

export default function CheckoutCafe() {
  const [step, setStep] = useState<2 | 3>(2);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState<Address>(emptyAddress);
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [offers, setOffers] = useState(false);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState<"pix" | "card">("pix");
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  useEffect(() => {
    if (cep.length !== 8) {
      setCepStatus("idle");
      return;
    }

    const controller = new AbortController();
    setCepStatus("loading");
    fetch(`/api/cep?cep=${cep}`, { signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "CEP não encontrado.");
        setAddress(current => ({
          ...current,
          street: data.street ?? "",
          complement: data.complement ?? current.complement,
          neighborhood: data.neighborhood ?? "",
          city: data.city ?? "",
          state: data.state ?? "",
        }));
        setCepStatus("ready");
      })
      .catch(error => {
        if (error.name !== "AbortError") setCepStatus("error");
      });
    return () => controller.abort();
  }, [cep]);

  function updateAddress(field: keyof Address, value: string) {
    setAddress(current => ({ ...current, [field]: value }));
  }

  function continueToPayment(event: FormEvent) {
    event.preventDefault();
    const documentDigits = documentNumber.replace(/\D/g, "");
    const phoneDigits = phone.replace(/\D/g, "");
    if (!emailIsValid || fullName.trim().split(/\s+/).length < 2 || ![11, 14].includes(documentDigits.length) || phoneDigits.length < 10) {
      setError("Preencha nome completo, CPF ou CNPJ e telefone corretamente.");
      return;
    }
    if (cep.length !== 8) {
      setError("Preencha um e-mail válido e o CEP com 8 números.");
      return;
    }
    if (!address.street || !address.number || !address.neighborhood || !address.city || !address.state) {
      setError("Preencha todos os campos obrigatórios do endereço.");
      return;
    }
    setError(""); setStep(3); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function applyCoupon() {
    setCouponMessage(coupon.trim().toUpperCase() === "PRIMEIRACOMPRA" ? "Cupom aplicado." : "Cupom inválido.");
  }

  return (
    <div className={styles.shell}>
      <header className={styles.logoHeader}><a href="/"><Image src={logo} alt="Café com Deus Pai" width={663} height={746} priority /></a></header>

      <button className={styles.mobileSummaryToggle} type="button" onClick={() => setSummaryOpen(v => !v)} aria-expanded={summaryOpen}>
        <span><ChevronDown className={summaryOpen ? styles.rotated : ""} /> Ver detalhes do pedido</span><strong>R$289,90</strong>
      </button>

      <div className={styles.progress} aria-label="Etapas da compra">
        <div className={`${styles.step} ${styles.done}`}><span><Check /></span><b>Carrinho</b></div>
        <div className={`${styles.step} ${step === 2 ? styles.active : styles.done}`}><span>{step === 2 ? <Truck /> : <Check />}</span><b>Entrega</b></div>
        <div className={`${styles.step} ${step === 3 ? styles.active : ""}`}><span><CreditCard /></span><b>Pagamento</b></div>
      </div>

      <div className={styles.layout}>
        <main className={styles.formColumn}>
          <Coupon couponOpen={couponOpen} setCouponOpen={setCouponOpen} coupon={coupon} setCoupon={setCoupon} applyCoupon={applyCoupon} message={couponMessage} />
          {step === 2 ? (
            <form onSubmit={continueToPayment}>
              <section><h1>Dados de contato</h1><input className={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail" autoComplete="email" aria-label="E-mail" />
                {emailIsValid && <div className={styles.contactFields}>
                  <input className={`${styles.input} ${styles.fullRow}`} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nome completo" autoComplete="name" aria-label="Nome completo" />
                  <input className={styles.input} value={documentNumber} onChange={e => setDocumentNumber(formatDocument(e.target.value))} placeholder="CPF ou CNPJ" inputMode="numeric" aria-label="CPF ou CNPJ" />
                  <input className={styles.input} value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="Telefone" inputMode="tel" autoComplete="tel" aria-label="Telefone" />
                </div>}
                <label className={styles.checkbox}><input type="checkbox" checked={offers} onChange={e => setOffers(e.target.checked)} /> <span>Receber ofertas e novidades por e-mail</span></label>
              </section>
              <section><h2>Entrega</h2><div className={styles.cepWrap}><input className={styles.input} inputMode="numeric" value={cep} onChange={e => setCep(e.target.value.replace(/\D/g, "").slice(0,8))} placeholder="CEP" autoComplete="postal-code" aria-label="CEP" /><a href="https://buscacepinter.correios.com.br/" target="_blank" rel="noreferrer">Não sei meu CEP</a></div>
                {cep.length === 8 && <div className={styles.addressFields}>
                  <p className={`${styles.cepMessage} ${cepStatus === "error" ? styles.cepError : ""}`}>{cepStatus === "loading" ? "Buscando endereço..." : cepStatus === "error" ? "CEP não encontrado. Preencha o endereço manualmente." : ""}</p>
                  <input className={`${styles.input} ${styles.street}`} value={address.street} onChange={e => updateAddress("street", e.target.value)} placeholder="Endereço" autoComplete="street-address" aria-label="Endereço" />
                  <input className={styles.input} value={address.number} onChange={e => updateAddress("number", e.target.value)} placeholder="Número" autoComplete="address-line2" aria-label="Número" />
                  <input className={styles.input} value={address.complement} onChange={e => updateAddress("complement", e.target.value)} placeholder="Complemento (opcional)" aria-label="Complemento" />
                  <input className={styles.input} value={address.neighborhood} onChange={e => updateAddress("neighborhood", e.target.value)} placeholder="Bairro" aria-label="Bairro" />
                  <input className={styles.input} value={address.city} onChange={e => updateAddress("city", e.target.value)} placeholder="Cidade" autoComplete="address-level2" aria-label="Cidade" />
                  <input className={styles.input} value={address.state} onChange={e => updateAddress("state", e.target.value.toUpperCase().slice(0, 2))} placeholder="Estado" autoComplete="address-level1" aria-label="Estado" />
                </div>}
              </section>
              {error && <p className={styles.error}>{error}</p>}<button className={styles.continue} type="submit">Continuar</button>
            </form>
          ) : (
            <section className={styles.payment}><button className={styles.back} onClick={() => setStep(2)}>← Voltar para entrega</button><h1>Método de pagamento</h1><p>Escolha como deseja pagar seu pedido.</p>
              <label className={payment === "pix" ? styles.selected : ""}><input type="radio" name="payment" checked={payment === "pix"} onChange={() => setPayment("pix")} /><span><b>PIX</b><small>Aprovação rápida</small></span><strong>R$289,90</strong></label>
              <label className={payment === "card" ? styles.selected : ""}><input type="radio" name="payment" checked={payment === "card"} onChange={() => setPayment("card")} /><span><b>Cartão de crédito</b><small>Até 4x sem juros</small></span><CreditCard /></label>
              <div className={styles.stopNotice}>Método selecionado. A cobrança não será processada nesta demonstração.</div>
            </section>
          )}
        </main>
        <aside className={`${styles.summary} ${summaryOpen ? styles.summaryOpen : ""}`}><OrderSummary /><div className={styles.desktopCoupon}><Coupon couponOpen={couponOpen} setCouponOpen={setCouponOpen} coupon={coupon} setCoupon={setCoupon} applyCoupon={applyCoupon} message={couponMessage} /></div></aside>
      </div>
    </div>
  );
}

function OrderSummary() { return <div><div className={styles.product}><Image src={productImage} alt="Combo Plus" width={128} height={128} /><div><b>Combo Plus | Frete grátis × 1</b></div><div className={styles.productPrice}><span><b>-44%</b> <s>R$513,90</s></span><strong>R$289,90</strong></div></div><div className={styles.totals}><p><span>Subtotal</span><strong>R$289,90</strong></p><p><span>Total</span><strong>R$289,90</strong></p></div></div> }

type CouponProps={couponOpen:boolean;setCouponOpen:(v:boolean)=>void;coupon:string;setCoupon:(v:string)=>void;applyCoupon:()=>void;message:string};
function Coupon({couponOpen,setCouponOpen,coupon,setCoupon,applyCoupon,message}:CouponProps){return <div className={styles.coupon}><button type="button" onClick={()=>setCouponOpen(!couponOpen)}>Adicionar cupom de desconto</button>{couponOpen&&<div className={styles.couponForm}><input value={coupon} onChange={e=>setCoupon(e.target.value)} placeholder="Código do cupom"/><button type="button" onClick={applyCoupon}>Aplicar</button>{message&&<small>{message}</small>}</div>}</div>}
