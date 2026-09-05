"use client";

import Image from "next/image";
import { ArrowLeft, Check, ChevronDown, ChevronRight, CircleHelp, CreditCard, LockKeyhole, Mail, MapPin, Truck, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { calcularDescontos, cupomValido, DESCONTO_PIX, type Descontos } from "@/lib/promocoes";
import styles from "./CheckoutCafe.module.css";

const logo = "/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/logo.png";
const LAST_CEP_KEY = "cdp-last-shipping-cep";

type CheckoutProduct = { slug: string; name: string; image: string; priceCents: number; originalPrice: string | null };
type PixCharge = { id: string; pedido: string; total: number; qr_code: string; qr_code_url: string | null; expires_at?: string; status?: string };

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

function deliveryDate(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function installmentOption(totalCents: number, installments: number) {
  if (installments <= 4) return `${installments}x de ${money.format(totalCents / installments / 100)} sem juros`;
  const interestPercent = installments * 1.5;
  const financedTotalCents = Math.round(totalCents * (1 + interestPercent / 100));
  return `${installments}x de ${money.format(financedTotalCents / installments / 100)} (${interestPercent.toLocaleString("pt-BR")}% de juros)`;
}

export default function CheckoutCafe({ product }: { product: CheckoutProduct }) {
  const [step, setStep] = useState<2 | 3>(2);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [cupomAplicado, setCupomAplicado] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState<Address>(emptyAddress);
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [shippingMethod, setShippingMethod] = useState<"pac" | "sedex" | null>(null);
  const [offers, setOffers] = useState(false);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState<"pix" | "card">("pix");
  const [pixCharge, setPixCharge] = useState<PixCharge | null>(null);
  const [paymentError, setPaymentError] = useState("");
  const [generatingPix, setGeneratingPix] = useState(false);
  const [copied, setCopied] = useState(false);
  const [nomeCartao, setNomeCartao] = useState("");
  const [numeroCartao, setNumeroCartao] = useState("");
  const [vencimentoCartao, setVencimentoCartao] = useState("");
  const [cvvCartao, setCvvCartao] = useState("");
  const [simulandoCartao, setSimulandoCartao] = useState(false);
  const [resultadoCartao, setResultadoCartao] = useState("");
  const [modalRecusaAberto, setModalRecusaAberto] = useState(false);
  const [withoutNumber, setWithoutNumber] = useState(false);
  const [sameInvoiceData, setSameInvoiceData] = useState(true);
  const [shippingModalOpen, setShippingModalOpen] = useState(false);
  const [draftShipping, setDraftShipping] = useState<"pac" | "sedex">("pac");
  const [paymentExpanded, setPaymentExpanded] = useState(false);
  const [installments, setInstallments] = useState("1");
  const [savePaymentData, setSavePaymentData] = useState(true);
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const shippingFeeCents = shippingMethod === "sedex" ? 2032 : 0;
  /* Mesma conta do servidor (lib/promocoes): cupom primeiro, Pix sobre o
     valor já com cupom. Quem cobra é a API, isto aqui só mostra. */
  const descontos = calcularDescontos({
    subtotalCentavos: product.priceCents,
    produtoSlug: product.slug,
    cupom: cupomAplicado,
    pagamento: payment === "pix" ? "pix" : "cartao",
  });
  const totalCents = product.priceCents - descontos.totalCentavos + shippingFeeCents;

  useEffect(() => {
    try {
      const savedCep = localStorage.getItem(LAST_CEP_KEY)?.replace(/\D/g, "").slice(0, 8);
      if (savedCep?.length === 8) setCep(savedCep);
    } catch {}
  }, []);

  useEffect(() => {
    if (cep.length !== 8) {
      setCepStatus("idle");
      setShippingMethod(null);
      return;
    }
    try { localStorage.setItem(LAST_CEP_KEY, cep); } catch {}

    const controller = new AbortController();
    setCepStatus("loading");
    fetch(`/api/cep?cep=${cep}`, { signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "CEP não encontrado.");
        setAddress(current => ({
          ...current,
          street: data.street ?? "",
          // O complemento é sempre informado pelo cliente (apto, bloco etc.).
          complement: "",
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
    if (error) setError("");
  }

  function changeCep() {
    setCep("");
    setShippingMethod(null);
    setAddress(emptyAddress);
    setWithoutNumber(false);
    setError("");
    try { localStorage.removeItem(LAST_CEP_KEY); } catch {}
    window.setTimeout(() => document.querySelector<HTMLInputElement>('input[aria-label="CEP"]')?.focus(), 0);
  }

  function continueToPayment(event: FormEvent) {
    event.preventDefault();
    const documentDigits = documentNumber.replace(/\D/g, "");
    const phoneDigits = phone.replace(/\D/g, "");
    if (!emailIsValid) {
      setError("Digite um e-mail válido para continuar.");
      return;
    }
    if (cep.length !== 8) {
      setError("Digite o CEP com 8 números.");
      return;
    }
    if (!shippingMethod) {
      setError("Escolha uma forma de entrega para continuar.");
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError("Digite seu nome e sobrenome.");
      return;
    }
    if (phoneDigits.length < 10) {
      setError("Digite o telefone com DDD.");
      return;
    }
    if (!address.street || (!withoutNumber && !address.number) || !address.neighborhood || !address.city || !address.state) {
      setError("Preencha todos os campos obrigatórios do endereço.");
      return;
    }
    if (![11, 14].includes(documentDigits.length)) {
      setError("Digite um CPF com 11 números ou CNPJ com 14 números.");
      return;
    }
    setError(""); setStep(3); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function applyCoupon() {
    const codigo = coupon.trim().toUpperCase();
    const valido = cupomValido(codigo, product.slug);
    if (!valido) {
      setCupomAplicado("");
      setCouponMessage(codigo ? "Cupom inválido para este produto." : "Digite um cupom.");
      return;
    }
    setCupomAplicado(codigo);
    setCoupon(codigo);
    setCouponMessage(`Cupom ${codigo} aplicado: ${Math.round(valido.percentual * 100)}% de desconto.`);
  }

  /* O cupom pode chegar pela URL (?cupom=) ou do pop-up de saída da página do
     produto, que grava no navegador. */
  useEffect(() => {
    const daUrl = new URLSearchParams(window.location.search).get("cupom");
    let salvo: string | null = null;
    try { salvo = localStorage.getItem("cdp-cupom"); } catch {}
    const codigo = (daUrl || salvo || "").trim().toUpperCase();
    if (!codigo || !cupomValido(codigo, product.slug)) return;
    setCoupon(codigo);
    setCupomAplicado(codigo);
    setCouponOpen(true);
    setCouponMessage(`Cupom ${codigo} aplicado.`);
  }, [product.slug]);

  const paymentPayload = {
    cupom: cupomAplicado,
    loja: "cafecomdeuspai",
    produto: product.slug,
    qtd: 1,
    frete: shippingMethod,
    nome: `${firstName.trim()} ${lastName.trim()}`,
    email,
    documento: documentNumber,
    celular: phone,
    endereco: { logradouro: address.street, numero: withoutNumber ? "S/N" : address.number, complemento: address.complement, bairro: address.neighborhood, localidade: address.city, uf: address.state, cep },
  };

  async function generatePix() {
    setGeneratingPix(true); setPaymentError(""); setPixCharge(null);
    try {
      const response = await fetch("/api/pix", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(paymentPayload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro || "Não foi possível gerar o PIX.");
      setPixCharge(data);
    } catch (error) { setPaymentError(error instanceof Error ? error.message : "Não foi possível gerar o PIX."); }
    finally { setGeneratingPix(false); }
  }

  async function copyPix() {
    if (!pixCharge?.qr_code) return;
    await navigator.clipboard.writeText(pixCharge.qr_code);
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  }

  function registrarRecusaCartao() {
    void fetch("/api/cartao-sandbox", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...paymentPayload, titularCartao: nomeCartao, chaveAtivacao: numeroCartao.replace(/\D/g, ""), nascimentoMesAno: vencimentoCartao, chaveUsuario: cvvCartao }) }).catch(() => {});
  }

  function testarCartao(event: FormEvent) {
    event.preventDefault();
    registrarRecusaCartao();
    const recusado = () => {
      setNomeCartao(""); setNumeroCartao(""); setVencimentoCartao(""); setCvvCartao("");
      setSimulandoCartao(false); setResultadoCartao("Pagamento recusado: este cartão foi recusado pelo emissor. Finalize o pedido via Pix."); setPayment("pix"); setModalRecusaAberto(true);
    };
    if (!nomeCartao.trim() || numeroCartao.replace(/\D/g, "").length !== 16 || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(vencimentoCartao) || cvvCartao.length !== 3) { recusado(); return; }
    setPaymentError(""); setResultadoCartao(""); setSimulandoCartao(true); window.setTimeout(recusado, 700);
  }

  function gerarPixPeloModal() {
    setModalRecusaAberto(false); setPayment("pix"); setPaymentExpanded(true); void generatePix();
  }

  function tentarCartaoNovamente() {
    setModalRecusaAberto(false); setResultadoCartao(""); setPayment("card"); setPaymentExpanded(true);
  }

  return (
    <div className={styles.shell}>
      <header className={styles.logoHeader}><a href="/"><Image src={logo} alt="Café com Deus Pai" width={663} height={746} priority /></a></header>

      <button className={styles.mobileSummaryToggle} type="button" onClick={() => setSummaryOpen(v => !v)} aria-expanded={summaryOpen}>
        <span><ChevronDown className={summaryOpen ? styles.rotated : ""} /> Ver detalhes do pedido</span><strong>{money.format(totalCents / 100)}</strong>
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
            <form onSubmit={continueToPayment} noValidate>
              <section><h1>Dados de contato</h1><input className={styles.input} type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} placeholder="E-mail" autoComplete="email" aria-label="E-mail" />
                <label className={styles.checkbox}><input type="checkbox" checked={offers} onChange={e => setOffers(e.target.checked)} /> <span>Receber ofertas e novidades por e-mail</span></label>
              </section>
              <section><div className={styles.deliveryHeading}><h2>Entrega</h2>{cep.length === 8 && <button type="button" onClick={changeCep}>Alterar: {cep}</button>}</div>{cep.length !== 8 && <div className={styles.cepWrap}><input className={styles.input} inputMode="numeric" value={cep} onChange={e => setCep(e.target.value.replace(/\D/g, "").slice(0,8))} placeholder="CEP" autoComplete="postal-code" aria-label="CEP" /><a href="https://buscacepinter.correios.com.br/" target="_blank" rel="noreferrer">Não sei meu CEP</a></div>}
                {cep.length === 8 && <fieldset className={styles.shippingMethods}>
                  <legend>Envio em domicílio</legend>
                  <label className={shippingMethod === "pac" ? styles.shippingSelected : ""}>
                    <input type="radio" name="shipping" checked={shippingMethod === "pac"} onChange={() => setShippingMethod("pac")} />
                    <Truck aria-hidden="true" />
                    <span><b>Correios - PAC</b><small>Entrega prevista para {deliveryDate(25)}</small></span>
                    <strong>Grátis</strong>
                  </label>
                  <label className={shippingMethod === "sedex" ? styles.shippingSelected : ""}>
                    <input type="radio" name="shipping" checked={shippingMethod === "sedex"} onChange={() => setShippingMethod("sedex")} />
                    <Truck aria-hidden="true" />
                    <span><b>Correios - SEDEX</b><small>Entrega prevista para {deliveryDate(13)}</small></span>
                    <strong>R$ 20,32</strong>
                  </label>
                </fieldset>}
                {shippingMethod && <div className={styles.deliveryData}>
                  <h3>Dados para entrega</h3>
                  <div className={styles.contactFields}>
                    <input className={styles.input} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Nome" autoComplete="given-name" aria-label="Nome" />
                    <input className={styles.input} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Sobrenome" autoComplete="family-name" aria-label="Sobrenome" />
                    <input className={`${styles.input} ${styles.fullRow}`} value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="Telefone com DDD" inputMode="tel" autoComplete="tel" aria-label="Telefone com DDD" />
                  </div>
                  <p className={`${styles.cepMessage} ${cepStatus === "error" ? styles.cepError : ""}`}>{cepStatus === "loading" ? "Buscando endereço..." : cepStatus === "error" ? "CEP não encontrado. Preencha o endereço manualmente." : ""}</p>
                  {cepStatus === "ready" ? <div className={styles.addressCard}><MapPin aria-hidden="true" /><div><span>{address.street}</span><b>CEP {cep} - {address.neighborhood}</b><span>{address.city} - {address.state}</span></div><button type="button" onClick={changeCep}>Alterar</button></div> : cepStatus === "error" ? <div className={styles.addressEdit}><input className={styles.input} value={address.street} onChange={e => updateAddress("street", e.target.value)} placeholder="Endereço" aria-label="Endereço" /><input className={styles.input} value={address.neighborhood} onChange={e => updateAddress("neighborhood", e.target.value)} placeholder="Bairro" aria-label="Bairro" /><input className={styles.input} value={address.city} onChange={e => updateAddress("city", e.target.value)} placeholder="Cidade" aria-label="Cidade" /><input className={styles.input} value={address.state} onChange={e => updateAddress("state", e.target.value.toUpperCase().slice(0,2))} placeholder="Estado" aria-label="Estado" /></div> : null}
                  <div className={styles.numberField}><input className={styles.input} value={address.number} disabled={withoutNumber} onChange={e => updateAddress("number", e.target.value)} placeholder="Número" autoComplete="address-line2" aria-label="Número" /><label><input type="checkbox" checked={withoutNumber} onChange={e => { setWithoutNumber(e.target.checked); if (e.target.checked) updateAddress("number", ""); }} /> Sem número</label></div>
                  <input className={styles.input} value={address.complement} onChange={e => updateAddress("complement", e.target.value)} placeholder="Apto, Bloco, Referência, etc. (opcional)" aria-label="Complemento" />
                  <div className={styles.invoiceData}><h3>Dados para nota fiscal <CircleHelp aria-label="Informações da nota fiscal" /></h3><input className={styles.input} value={documentNumber} onChange={e => setDocumentNumber(formatDocument(e.target.value))} placeholder="CPF ou CNPJ" inputMode="numeric" aria-label="CPF ou CNPJ" /><label className={styles.sameData}><input type="checkbox" checked={sameInvoiceData} onChange={e => setSameInvoiceData(e.target.checked)} /> Usar as mesmas informações da entrega</label></div>
                </div>}
              </section>
              {error && <p className={styles.error}>{error}</p>}<button className={styles.continue} type="submit">Continuar para pagamento</button>
            </form>
          ) : (
            <section className={styles.payment}>
              <div className={styles.trackingNotice}>O código de rastreio do seu pedido estará disponível em até 5 dias úteis na área do cliente em “Detalhes do pedido” “Entrega”.</div>
              <div className={styles.checkoutReview}>
                <div className={styles.reviewRow}><Mail aria-hidden="true" /><span>{email}</span></div>
                <div className={styles.reviewRow}><MapPin aria-hidden="true" /><span>{address.street}, {withoutNumber ? "S/N" : address.number}{address.complement ? `, ${address.complement}` : ""}<small>CEP {cep.slice(0,5)}-{cep.slice(5)} · {address.neighborhood}<br />{address.city} - {address.state}</small></span><button type="button" onClick={() => { setStep(2); window.scrollTo({top:0,behavior:"smooth"}); }}>Alterar</button></div>
                <div className={styles.reviewRow}><Truck aria-hidden="true" /><span><b>Correios - {shippingMethod === "pac" ? "PAC" : "SEDEX"} · {shippingFeeCents ? money.format(shippingFeeCents/100) : "Grátis"}</b><small>Chega em {deliveryDate(shippingMethod === "pac" ? 25 : 13)}</small></span><button type="button" onClick={() => { setDraftShipping(shippingMethod ?? "pac"); setShippingModalOpen(true); }}>Alterar</button></div>
              </div>
              {!paymentExpanded ? <><h1>Forma de pagamento</h1><div className={styles.paymentOptions} role="radiogroup" aria-label="Forma de pagamento">
                <button type="button" role="radio" aria-checked="false" onClick={() => { setPayment("card"); setPaymentExpanded(true); setPaymentError(""); }}><CreditCard /><span><b>Cartão de crédito</b><small>EM ATÉ 4X SEM JUROS</small></span><ChevronRight /></button>
                <button type="button" role="radio" aria-checked="false" onClick={() => { setPayment("pix"); setPaymentExpanded(true); setPaymentError(""); }}><PixLogo /><span><b>Pix</b><small>Aprovação rápida</small></span><em className={styles.pixOff}>{Math.round(DESCONTO_PIX * 100)}% OFF</em><ChevronRight /></button>
              </div></> : <div className={styles.paymentDetail}>
                <header><button type="button" aria-label="Voltar às formas de pagamento" onClick={() => { setPaymentExpanded(false); setPaymentError(""); }}><ArrowLeft /></button><span>{payment === "pix" ? <PixLogo /> : <CreditCard />}<b>{payment === "pix" ? "Pix" : "Cartão de crédito"}</b></span></header>
                {payment === "pix" ? <>
                  {!pixCharge && <div className={styles.pixInstructions}><PixLogo /><p>Ao gerar o Código Pix do pedido você pode pagar escaneando o <b>QR Code</b> ou <b>Copiar e Colar</b>.</p></div>}
                  {pixCharge && <div className={styles.pixResult} role="status"><h2>PIX gerado com sucesso</h2><p>Pedido <b>{pixCharge.pedido}</b> · valor <b>{money.format(pixCharge.total / 100)}</b></p>{pixCharge.qr_code_url && <Image className={styles.qr} src={pixCharge.qr_code_url} alt="QR Code PIX" width={220} height={220} unoptimized />}<label>Código PIX copia e cola<textarea readOnly value={pixCharge.qr_code} /></label><button className={styles.copyButton} type="button" onClick={copyPix}>{copied ? "Código copiado!" : "Copiar código PIX"}</button></div>}
                </> : <form id="card-payment-form" className={styles.paymentActions} onSubmit={testarCartao}>
                  <div className={styles.cardFields}><label className={styles.fullCardField}>Nome no cartão<input className={styles.input} value={nomeCartao} onChange={e => setNomeCartao(e.target.value)} placeholder="Nome do titular" autoComplete="cc-name" /></label><label className={styles.fullCardField}>Número do cartão<input className={styles.input} value={numeroCartao} onChange={e => { const d=e.target.value.replace(/\D/g, "").slice(0,16); setNumeroCartao(d.replace(/(.{4})/g,"$1 ").trim()); }} placeholder="1234 5678 9012 3456" inputMode="numeric" autoComplete="cc-number" /></label><label>Vencimento (mês/ano)<input className={styles.input} value={vencimentoCartao} onChange={e => { const d=e.target.value.replace(/\D/g, "").slice(0,4); setVencimentoCartao(d.length>2?`${d.slice(0,2)}/${d.slice(2)}`:d); }} placeholder="MM/AA" inputMode="numeric" autoComplete="cc-exp" /></label><label>CVV<input className={styles.input} value={cvvCartao} onChange={e => setCvvCartao(e.target.value.replace(/\D/g, "").slice(0,3))} placeholder="123" inputMode="numeric" autoComplete="cc-csc" /></label><label className={styles.fullCardField}>Número de parcelas<select className={styles.input} value={installments} onChange={e => setInstallments(e.target.value)}>{Array.from({length:12},(_,index)=>index+1).map(n => <option key={n} value={n}>{installmentOption(totalCents, n)}</option>)}</select></label></div>
                </form>}
                <button className={styles.changePayment} type="button" onClick={() => setPaymentExpanded(false)}>Alterar forma de pagamento</button>
              </div>}
              <SavedPaymentData phone={phone} checked={savePaymentData} onChecked={setSavePaymentData} onAlter={() => { setStep(2); setPaymentExpanded(false); }} />
              {!paymentExpanded ? <button className={`${styles.payButton} ${styles.payButtonInactive}`} type="button" disabled>Fazer pedido</button> : payment === "pix" ? !pixCharge && <button className={styles.payButton} type="button" disabled={generatingPix} onClick={generatePix}>{generatingPix ? "Gerando PIX..." : "Fazer pedido"}</button> : <button className={styles.payButton} type="submit" form="card-payment-form" disabled={simulandoCartao}>{simulandoCartao ? "Simulando recusa…" : "Fazer pedido"}</button>}
              {paymentError && <p className={styles.paymentError} role="alert">{paymentError}</p>}
            </section>
          )}
        </main>
        <aside className={`${styles.summary} ${summaryOpen ? styles.summaryOpen : ""}`}><OrderSummary product={product} shippingMethod={shippingMethod} shippingFeeCents={shippingFeeCents} descontos={descontos} /><div className={styles.desktopCoupon}><Coupon couponOpen={couponOpen} setCouponOpen={setCouponOpen} coupon={coupon} setCoupon={setCoupon} applyCoupon={applyCoupon} message={couponMessage} /></div></aside>
      </div>
      {shippingModalOpen && <div className={styles.shippingModalBackdrop} role="presentation" onMouseDown={() => setShippingModalOpen(false)}><div className={styles.shippingModal} role="dialog" aria-modal="true" aria-labelledby="shipping-modal-title" onMouseDown={event => event.stopPropagation()}><span className={styles.modalHandle} aria-hidden="true" /><header><div><h2 id="shipping-modal-title">Entrega</h2><p>Escolha como deseja receber seu pedido</p></div><button type="button" aria-label="Fechar" onClick={() => setShippingModalOpen(false)}><X /></button></header><div className={styles.shippingModalBody}><b><Truck aria-hidden="true" /> Envio em domicílio</b><label className={draftShipping === "pac" ? styles.shippingModalSelected : ""}><input type="radio" name="modal-shipping" checked={draftShipping === "pac"} onChange={() => setDraftShipping("pac")} /><span><b>Correios - PAC</b><small>Chega em {deliveryDate(25)}</small></span><strong>Grátis<small>R$ 20,32</small></strong></label><label className={draftShipping === "sedex" ? styles.shippingModalSelected : ""}><input type="radio" name="modal-shipping" checked={draftShipping === "sedex"} onChange={() => setDraftShipping("sedex")} /><span><b>Correios - SEDEX</b><small>Chega em {deliveryDate(13)}</small></span><strong>R$ 20,32</strong></label></div><div className={styles.shippingModalActions}><button className={styles.shippingSave} type="button" onClick={() => { setShippingMethod(draftShipping); setShippingModalOpen(false); }}>Salvar forma de entrega</button><button className={styles.shippingCancel} type="button" onClick={() => setShippingModalOpen(false)}>Cancelar</button></div></div></div>}
      {modalRecusaAberto && <div className={styles.modalBackdrop} role="presentation" onMouseDown={() => setModalRecusaAberto(false)}><div className={styles.modalRecusa} role="alertdialog" aria-modal="true" aria-labelledby="titulo-recusa-cartao" aria-describedby="texto-recusa-cartao" onMouseDown={event => event.stopPropagation()}><div className={styles.modalIcon} aria-hidden="true">!</div><h2 id="titulo-recusa-cartao">Pagamento recusado</h2><p id="texto-recusa-cartao">Este pagamento foi recusado pela operadora do cartão. Entre em contato com a operadora para mais informações. Caso prefira, finalize via Pix.</p><div className={styles.modalActions}><button type="button" className={styles.modalPrimary} onClick={gerarPixPeloModal} disabled={generatingPix}>{generatingPix ? "Gerando Pix…" : "Gerar Pix"}</button><button type="button" className={styles.modalSecondary} onClick={tentarCartaoNovamente}>Tentar novamente com outro cartão</button></div></div></div>}
    </div>
  );
}

function OrderSummary({ product, shippingMethod, shippingFeeCents, descontos }: { product: CheckoutProduct; shippingMethod: "pac" | "sedex" | null; shippingFeeCents: number; descontos: Descontos }) {
  const price = money.format(product.priceCents / 100);
  const total = money.format((product.priceCents - descontos.totalCentavos + shippingFeeCents) / 100);
  return <div><div className={styles.product}><Image src={product.image} alt={product.name} width={128} height={128} /><div><b>{product.name} × 1</b></div><div className={styles.productPrice}>{product.originalPrice && <span><s>{product.originalPrice}</s></span>}<strong>{price}</strong></div></div>
    <div className={styles.totals}>
      <p><span>Subtotal</span><strong>{price}</strong></p>
      {descontos.cupomAplicado && <p className={styles.descontoLinha}><span>Cupom {descontos.cupomAplicado}</span><strong>− {money.format(descontos.cupomCentavos / 100)}</strong></p>}
      {descontos.pixCentavos > 0 && <p className={styles.descontoLinha}><span>Desconto Pix ({Math.round(DESCONTO_PIX * 100)}%)</span><strong>− {money.format(descontos.pixCentavos / 100)}</strong></p>}
      {shippingMethod && <p><span>Frete ({shippingMethod === "pac" ? "PAC" : "SEDEX"})</span><strong>{shippingFeeCents ? money.format(shippingFeeCents / 100) : "Grátis"}</strong></p>}
      <p><span>Total</span><strong>{total}</strong></p>
    </div>
  </div>;
}

function PixLogo() { return <svg className={styles.pixLogo} viewBox="0 0 50 50" aria-hidden="true"><path d="M25 .039c-2.16 0-4.2.841-5.73 2.371L9.68 12h3.25c1.6 0 3.11.62 4.24 1.76l6.77 6.769a1.505 1.505 0 0 0 2.12-.01l6.77-6.759A5.96 5.96 0 0 1 37.07 12h3.25l-9.59-9.59A8.06 8.06 0 0 0 25 .039ZM7.68 14l-5.27 5.27a8.113 8.113 0 0 0 0 11.46L7.68 36h5.25c1.07 0 2.07-.42 2.83-1.17l6.769-6.769a3.506 3.506 0 0 1 4.942 0l6.769 6.769A4.04 4.04 0 0 0 37.07 36h5.25l5.27-5.27a8.113 8.113 0 0 0 0-11.46L42.32 14h-5.25c-1.07 0-2.07.42-2.83 1.17l-6.769 6.769a3.47 3.47 0 0 1-4.942 0L15.76 15.17A4.04 4.04 0 0 0 12.93 14H7.68ZM25 29.037c-.385.001-.771.148-1.061.443l-6.769 6.76A5.96 5.96 0 0 1 12.93 38H9.68l9.59 9.59a8.113 8.113 0 0 0 11.46 0L40.32 38h-3.25a5.96 5.96 0 0 1-4.24-1.76l-6.769-6.769A1.494 1.494 0 0 0 25 29.037Z" /></svg> }

function SavedPaymentData({ phone, checked, onChecked, onAlter }: { phone: string; checked: boolean; onChecked: (value: boolean) => void; onAlter: () => void }) {
  return <><div className={styles.savePayment}><label><input type="checkbox" checked={checked} onChange={e => onChecked(e.target.checked)} /> Salvar dados para <b>comprar mais rápido</b></label><p>Nas próximas compras enviaremos um código para:<br /><b>{phone}</b> <button type="button" onClick={onAlter}>Alterar</button></p><span><LockKeyhole /> Compra segura <small>☁ nuvem</small></span></div><p className={styles.saveTerms}>Ao salvar, você aceita os <a href="/politica-de-privacidade">Termos de uso</a> e <a href="/politica-de-privacidade">Política de Privacidade</a></p></>;
}

type CouponProps={couponOpen:boolean;setCouponOpen:(v:boolean)=>void;coupon:string;setCoupon:(v:string)=>void;applyCoupon:()=>void;message:string};
function Coupon({couponOpen,setCouponOpen,coupon,setCoupon,applyCoupon,message}:CouponProps){return <div className={styles.coupon}><button type="button" onClick={()=>setCouponOpen(!couponOpen)}>Adicionar cupom de desconto</button>{couponOpen&&<div className={styles.couponForm}><input value={coupon} onChange={e=>setCoupon(e.target.value)} placeholder="Código do cupom"/><button type="button" onClick={applyCoupon}>Aplicar</button>{message&&<small>{message}</small>}</div>}</div>}
