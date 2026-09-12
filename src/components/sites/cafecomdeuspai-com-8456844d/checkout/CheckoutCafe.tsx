"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check, ChevronDown, ChevronRight, CircleHelp, CreditCard, LockKeyhole, Mail, MapPin, Truck, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { salvarPagamentoParaTela } from "@/lib/pagamento-navegacao";
import { EventoMeta, dadosProdutoPixel, pixel } from "@/components/marketing/MetaPixel";
import { registrar, registrarConfirmado } from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/Rastreador";
import { calcularDescontosCarrinho, cupomValidoCarrinho, DESCONTO_PIX, type Descontos } from "@/lib/promocoes";
import styles from "./CheckoutCafe.module.css";
import { tentativaPagamento, liberarTentativaEncerrada } from "@/lib/tentativa-pagamento";
import CartaoAxxon from "@/components/pagamentos/CartaoAxxon";
import ExitOffer from "@/components/sites/cafecomdeuspai-com-8456844d/shared/ExitOffer";
import { documentoBrasileiroValido } from "@/lib/documento-br";

const logo = "/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/logo.png";
const LAST_CEP_KEY = "cdp-last-shipping-cep";
const SAVED_CONTACT_KEY = "cdp-checkout-contact";
const CUPOM_SAIDA = "CAFECOMDEUSPAI27";
const DESCONTO_SAIDA = 4;

type CheckoutProduct = { slug: string; name: string; image: string; priceCents: number; originalPrice: string | null; quantity: number };
type PixCharge = { id: string; pedido: string; total: number; qr_code: string; qr_code_url: string | null; expires_at?: string; status?: string };

type Address = {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

export type CheckoutPrefill = {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  documentNumber?: string | null;
  phone?: string | null;
  cep?: string | null;
  address?: Partial<Address> | null;
  shippingMethod?: "pac" | "sedex" | null;
  paymentMethod?: "pix" | "card" | null;
  coupon?: string | null;
  withoutNumber?: boolean;
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

export default function CheckoutCafe({ products, prefill = null }: { products: CheckoutProduct[]; prefill?: CheckoutPrefill | null }) {
  const product = products[0];
  const subtotalCents = products.reduce((total, item) => total + item.priceCents * item.quantity, 0);
  const cartKey = products.map((item) => `${item.slug}:${item.quantity}`).join("|");
  const productName = products.length === 1 ? product.name : `${products.length} produtos`;
  const [gatewayConfig, setGatewayConfig] = useState<{ pix: string; cartao: string; publicKey: string | null; cartaoDisponivel?: boolean; parcelas?: number } | null>(null);
  const [gatewayConfigStatus, setGatewayConfigStatus] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    const controller = new AbortController();
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    async function loadGatewayConfig(attempt = 0) {
      try {
        const response = await fetch("/api/pagamentos/config", {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]),
        });
        if (!response.ok) throw new Error("Configuração indisponível");
        setGatewayConfig(await response.json());
        setGatewayConfigStatus("ready");
      } catch {
        if (controller.signal.aborted) return;
        if (attempt < 2) {
          retryTimer = setTimeout(() => void loadGatewayConfig(attempt + 1), 400 * (attempt + 1));
          return;
        }
        setGatewayConfigStatus("error");
      }
    }

    void loadGatewayConfig();
    return () => {
      controller.abort();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);
  const [step, setStep] = useState<2 | 3>(2);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const cupomRecuperado = prefill?.coupon?.trim().toUpperCase() ?? "";
  const [coupon, setCoupon] = useState(cupomRecuperado);
  const [couponMessage, setCouponMessage] = useState("");
  const [cupomAplicado, setCupomAplicado] = useState(() =>
    cupomValidoCarrinho(cupomRecuperado, products.map((item) => item.slug)) ? cupomRecuperado : "",
  );
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [firstName, setFirstName] = useState(prefill?.firstName ?? "");
  const [lastName, setLastName] = useState(prefill?.lastName ?? "");
  const [documentNumber, setDocumentNumber] = useState(() => formatDocument(prefill?.documentNumber ?? ""));
  const [phone, setPhone] = useState(() => formatPhone(prefill?.phone ?? ""));
  const [cep, setCep] = useState(() => (prefill?.cep ?? "").replace(/\D/g, "").slice(0, 8));
  const [address, setAddress] = useState<Address>(() => ({ ...emptyAddress, ...(prefill?.address ?? {}) }));
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "ready" | "partial" | "error">("idle");
  const [shippingMethod, setShippingMethod] = useState<"pac" | "sedex" | null>(prefill?.shippingMethod ?? null);
  const [offers, setOffers] = useState(false);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState<"pix" | "card">(prefill?.paymentMethod === "card" ? "card" : "pix");
  const [pixCharge, setPixCharge] = useState<PixCharge | null>(null);
  const router = useRouter();

  /* A resposta do gateway ainda leva alguns segundos. Deixar a rota do PIX
     preparada em paralelo evita acrescentar o download da próxima tela ao
     tempo percebido depois que a cobrança estiver pronta. */
  useEffect(() => {
    router.prefetch("/pagamento");
  }, [router]);

  const [paymentError, setPaymentError] = useState("");
  const [generatingPix, setGeneratingPix] = useState(false);
  const [pixStage, setPixStage] = useState<"idle" | "criando" | "pronto">("idle");
  const [copied, setCopied] = useState(false);
  const [withoutNumber, setWithoutNumber] = useState(Boolean(prefill?.withoutNumber));
  const [sameInvoiceData, setSameInvoiceData] = useState(true);
  const [shippingModalOpen, setShippingModalOpen] = useState(false);
  const [draftShipping, setDraftShipping] = useState<"pac" | "sedex">("pac");
  const [paymentExpanded, setPaymentExpanded] = useState(false);
  const [savePaymentData, setSavePaymentData] = useState(false);
  const firstNameInput = useRef<HTMLInputElement>(null);
  const addressNumberInput = useRef<HTMLInputElement>(null);
  const documentInput = useRef<HTMLInputElement>(null);
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const shippingFeeCents = shippingMethod === "sedex" ? 2032 : 0;
  /* Mesma conta do servidor (lib/promocoes): cupom primeiro, Pix sobre o
     valor já com cupom. Quem cobra é a API, isto aqui só mostra. */
  const descontos = calcularDescontosCarrinho({
    itens: products.map((item) => ({ produtoSlug: item.slug, subtotalCentavos: item.priceCents * item.quantity })),
    cupom: cupomAplicado,
    pagamento: payment === "pix" ? "pix" : "cartao",
    freteCentavos: shippingFeeCents,
  });
  const totalCents = subtotalCents - descontos.totalCentavos + shippingFeeCents;

  useEffect(() => {
    if (prefill) return;
    try {
      const savedCep = localStorage.getItem(LAST_CEP_KEY)?.replace(/\D/g, "").slice(0, 8);
      // Preferências client-only são hidratadas após a montagem de propósito.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (savedCep?.length === 8) setCep(savedCep);
      const savedContact = JSON.parse(localStorage.getItem(SAVED_CONTACT_KEY) ?? "null") as { email?: unknown; phone?: unknown } | null;
      if (savedContact && typeof savedContact.email === "string" && typeof savedContact.phone === "string") {
        setEmail(savedContact.email);
        setPhone(formatPhone(savedContact.phone));
        setSavePaymentData(true);
      }
    } catch {}
  }, [prefill]);

  useEffect(() => {
    if (step !== 3) return;
    try {
      if (savePaymentData) localStorage.setItem(SAVED_CONTACT_KEY, JSON.stringify({ email: email.trim(), phone: phone.replace(/\D/g, "") }));
      else localStorage.removeItem(SAVED_CONTACT_KEY);
    } catch {}
  }, [step, savePaymentData, email, phone]);

  /* Carrinho abandonado: salva o que a pessoa já preencheu e em que etapa
     parou, para o painel poder recuperar a venda. Só grava com e-mail ou
     telefone (sem contato não há o que recuperar) e sem interromper a digitação
     — espera 1,2 s de pausa. A compra concluída sai da lista no painel, que
     ignora sessões com pedido pago. */
  const finalizado = useRef(false);
  const abandonoPendente = useRef<Record<string, unknown> | null>(null);
  useEffect(() => {
    if (finalizado.current) {
      abandonoPendente.current = null;
      return;
    }
    const contato = email.trim() || phone.replace(/\D/g, "");
    if (!contato) {
      abandonoPendente.current = null;
      return;
    }
    const etapa = step === 3 ? "Pagamento"
      : cep.replace(/\D/g, "").length === 8 || address.street ? "Entrega"
      : "Contato";
    const dados = {
      etapa,
      email: email.trim() || null,
      nome: [firstName, lastName].filter(Boolean).join(" ").trim() || null,
      telefone: phone.replace(/\D/g, "") || null,
      documento: documentNumber.replace(/\D/g, "") || null,
      cep: cep.replace(/\D/g, "") || null,
      logradouro: address.street || null,
      numero: withoutNumber ? "S/N" : address.number || null,
      complemento: address.complement || null,
      bairro: address.neighborhood || null,
      cidade: address.city || null,
      uf: address.state || null,
      produto: products.map((item) => `${item.quantity}x ${item.slug}`).join(", "),
      produto_nome: products.map((item) => `${item.quantity}x ${item.name}`).join("; "),
      itens: products.map((item) => ({ slug: item.slug, quantidade: item.quantity })),
      frete_tipo: shippingMethod,
      metodo_pagamento: payment,
      cupom: cupomAplicado || null,
      sem_numero: withoutNumber,
      valor: totalCents,
    };
    abandonoPendente.current = dados;
    const id = window.setTimeout(() => {
      void registrarConfirmado("checkout_parcial", dados).then((confirmado) => {
        if (confirmado && abandonoPendente.current === dados) abandonoPendente.current = null;
      });
    }, 1200);
    return () => window.clearTimeout(id);
  }, [email, firstName, lastName, phone, documentNumber, cep, address, step, products, totalCents, shippingMethod, payment, cupomAplicado, withoutNumber]);

  /* No celular a aba pode ser congelada sem dar tempo ao debounce. Envia o
     último estado pendente quando a página é ocultada ou fechada. */
  useEffect(() => {
    const enviarPendente = () => {
      const dados = abandonoPendente.current;
      if (!dados || finalizado.current) return;
      abandonoPendente.current = null;
      registrar("checkout_parcial", dados);
    };
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === "hidden") enviarPendente();
    };
    window.addEventListener("pagehide", enviarPendente);
    document.addEventListener("visibilitychange", aoMudarVisibilidade);
    return () => {
      window.removeEventListener("pagehide", enviarPendente);
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
    };
  }, []);

  useEffect(() => {
    if (cep.length !== 8) {
      // CEP incompleto redefine imediatamente o estado derivado da consulta.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCepStatus("idle");
      setShippingMethod(null);
      return;
    }
    try { localStorage.setItem(LAST_CEP_KEY, cep); } catch {}

    const controller = new AbortController();
    setCepStatus("loading");
    fetch(`/api/cep?cep=${cep}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(6500)]) })
      .then(async response => {
        const data = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok) throw new Error(data.error || "CEP não encontrado.");
        const campo = (valor: unknown) => typeof valor === "string" ? valor.trim() : "";
        const encontrado = {
          street: campo(data.street), neighborhood: campo(data.neighborhood),
          city: campo(data.city), state: campo(data.state),
        };
        setAddress(current => ({
          ...current,
          ...encontrado,
        }));
        // Mantém o modo manual mesmo depois de digitar: não desmonta os
        // campos enquanto o cliente está completando o endereço.
        setCepStatus(Object.values(encontrado).every(Boolean) ? "ready" : "partial");
      })
      .catch(() => {
        if (!controller.signal.aborted) setCepStatus("error");
      });
    return () => controller.abort();
  }, [cep]);

  function updateAddress(field: keyof Address, value: string) {
    setAddress(current => ({ ...current, [field]: value }));
    if (error) setError("");
  }

  function selectShipping(method: "pac" | "sedex") {
    const openingDeliveryFields = shippingMethod === null;
    // Renderiza os dados de entrega ainda dentro do gesto do usuário. Assim o
    // foco também abre o teclado no Safari do iPhone, que bloqueia focos tardios.
    flushSync(() => {
      setShippingMethod(method);
      setError("");
    });
    if (openingDeliveryFields) {
      firstNameInput.current?.focus({ preventScroll: true });
      firstNameInput.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function changePhone(value: string) {
    const previousLength = phone.replace(/\D/g, "").length;
    const formatted = formatPhone(value);
    const currentLength = formatted.replace(/\D/g, "").length;
    setPhone(formatted);
    if (error) setError("");
    if (!withoutNumber && previousLength < 11 && currentLength === 11) {
      addressNumberInput.current?.focus({ preventScroll: true });
      addressNumberInput.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
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
    if (cepStatus === "loading") {
      setError("Aguarde a consulta do CEP terminar.");
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
    const obrigatorios: [keyof Address, string][] = [["street", "rua"], ["neighborhood", "bairro"], ["city", "cidade"], ["state", "estado"]];
    if (!withoutNumber) obrigatorios.push(["number", "número (ou marque Sem número)"]);
    const faltando = obrigatorios.filter(([campo]) => !address[campo].trim()).map(([, nome]) => nome);
    if (faltando.length) {
      setError(`Preencha os campos do endereço: ${faltando.join(", ")}.`);
      return;
    }
    if (!documentoBrasileiroValido(documentDigits)) {
      setError("Digite um CPF ou CNPJ válido. Confira todos os números.");
      documentInput.current?.focus({ preventScroll: true });
      documentInput.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setError(""); setStep(3); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function applyCoupon() {
    const codigo = coupon.trim().toUpperCase();
    const valido = cupomValidoCarrinho(codigo, products.map((item) => item.slug));
    if (!valido) {
      setCupomAplicado("");
      setCouponMessage(codigo ? "Cupom inválido para este produto." : "Digite um cupom.");
      return;
    }
    setCupomAplicado(codigo);
    setCoupon(codigo);
    setCouponMessage(`Cupom ${codigo} aplicado: ${Math.round(valido.percentual * 100)}% de desconto.`);
  }

  function aplicarCupomSaida() {
    const valido = cupomValidoCarrinho(CUPOM_SAIDA, products.map((item) => item.slug));
    if (!valido) return;
    setCoupon(CUPOM_SAIDA);
    setCupomAplicado(CUPOM_SAIDA);
    setCouponOpen(true);
    setCouponMessage(`Cupom ${CUPOM_SAIDA} aplicado: ${DESCONTO_SAIDA}% de desconto.`);
    try { localStorage.setItem("cdp-cupom", CUPOM_SAIDA); } catch {}
  }

  /* O cupom pode chegar pela URL (?cupom=) ou do pop-up de saída da página do
     produto, que grava no navegador. */
  useEffect(() => {
    if (prefill?.coupon) return;
    const daUrl = new URLSearchParams(window.location.search).get("cupom");
    let salvo: string | null = null;
    try { salvo = localStorage.getItem("cdp-cupom"); } catch {}
    const codigo = (daUrl || salvo || "").trim().toUpperCase();
    if (!codigo || !cupomValidoCarrinho(codigo, products.map((item) => item.slug))) return;
    // Cupom persistido/da URL só está disponível depois que o cliente hidrata.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCoupon(codigo);
    setCupomAplicado(codigo);
    setCouponOpen(true);
    setCouponMessage(`Cupom ${codigo} aplicado.`);
  }, [products, prefill?.coupon]);

  const cartaoDisponivel = gatewayConfig?.cartaoDisponivel === true && Boolean(gatewayConfig.publicKey);
  const paymentPayload = {
    cupom: cupomAplicado,
    loja: "cafecomdeuspai",
    produto: product.slug,
    qtd: product.quantity,
    itens: products.map((item) => ({ produto: item.slug, qtd: item.quantity })),
    frete: shippingMethod,
    nome: `${firstName.trim()} ${lastName.trim()}`,
    email,
    documento: documentNumber,
    celular: phone,
    endereco: { logradouro: address.street, numero: withoutNumber ? "S/N" : address.number, complemento: address.complement, bairro: address.neighborhood, localidade: address.city, uf: address.state, cep },
  };

  async function generatePix() {
    setGeneratingPix(true); setPixStage("criando"); setPaymentError(""); setPixCharge(null);
    try {
      const tentativa = tentativaPagamento(cartKey, "pix");
      const response = await fetch("/api/pix", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...paymentPayload, tentativa }), signal: AbortSignal.timeout(35000) });
      const data = await response.json();
      if (!response.ok) {
        liberarTentativaEncerrada(cartKey, "pix", tentativa, data);
        const erroDocumento = typeof data.erro === "string" && /CPF|CNPJ|documento/i.test(data.erro);
        if (erroDocumento) {
          setStep(2);
          setPaymentExpanded(false);
          setError(data.erro);
          window.setTimeout(() => {
            documentInput.current?.focus({ preventScroll: true });
            documentInput.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 0);
          return;
        }
        throw new Error(data.erro || "Não foi possível gerar o PIX.");
      }
      setPixCharge(data);
      setPixStage("pronto");
      finalizado.current = true;   // saiu do funil de abandono: PIX gerado
      abandonoPendente.current = null;
      pixel("AddPaymentInfo", { ...dadosProdutoPixel(cartKey, productName, data.total, products.reduce((sum, item) => sum + item.quantity, 0)), payment_method: "pix" });
      /* O PIX passa a ter página própria: tela sem menu nem sacola, só o
         código e o passo a passo. Guardar no sessionStorage evita uma
         segunda ida ao servidor — o dado já está aqui. */
      try {
        salvarPagamentoParaTela({
          ...data,
          metodo: "pix",
          confirmado: data.status === "approved" || data.status === "paid",
          produto_nome: productName,
          produto_imagem: product.image,
        });
      } catch { /* storage bloqueado */ }
      // Uma confirmação curta evita que a troca imediata de rota pareça um
      // piscar ou uma tela travada, sem acrescentar espera perceptível.
      await new Promise<void>(resolve => window.setTimeout(resolve, 360));
      router.push("/pagamento");
    } catch (error) { setPaymentError(error instanceof Error ? error.message : "Não foi possível gerar o PIX."); }
    finally { setGeneratingPix(false); setPixStage("idle"); }
  }

  async function copyPix() {
    if (!pixCharge?.qr_code) return;
    await navigator.clipboard.writeText(pixCharge.qr_code);
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  }


  return (
    <div className={styles.shell}>
      <EventoMeta evento="InitiateCheckout" umaVezPor={cartKey} dados={dadosProdutoPixel(cartKey, productName, totalCents, products.reduce((sum, item) => sum + item.quantity, 0))} />
      <header className={styles.logoHeader}><Link href="/"><Image src={logo} alt="Café com Deus Pai" width={663} height={746} priority /></Link></header>

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
                    <input type="radio" name="shipping" checked={shippingMethod === "pac"} onChange={() => selectShipping("pac")} />
                    <Truck aria-hidden="true" />
                    <span><b>Correios - PAC</b><small>Entrega prevista para {deliveryDate(25)}</small></span>
                    <strong>Grátis</strong>
                  </label>
                  <label className={shippingMethod === "sedex" ? styles.shippingSelected : ""}>
                    <input type="radio" name="shipping" checked={shippingMethod === "sedex"} onChange={() => selectShipping("sedex")} />
                    <Truck aria-hidden="true" />
                    <span><b>Correios - SEDEX</b><small>Entrega prevista para {deliveryDate(13)}</small></span>
                    <strong>R$ 20,32</strong>
                  </label>
                </fieldset>}
                {shippingMethod && <div className={styles.deliveryData}>
                  <h3>Dados para entrega</h3>
                  <div className={styles.contactFields}>
                    <input ref={firstNameInput} className={styles.input} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Nome" autoComplete="given-name" aria-label="Nome" />
                    <input className={styles.input} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Sobrenome" autoComplete="family-name" aria-label="Sobrenome" />
                    <input className={`${styles.input} ${styles.fullRow}`} value={phone} onChange={e => changePhone(e.target.value)} placeholder="Telefone com DDD" inputMode="tel" autoComplete="tel" aria-label="Telefone com DDD" />
                  </div>
                  <p role="status" className={`${styles.cepMessage} ${cepStatus === "error" ? styles.cepError : ""}`}>{cepStatus === "loading" ? "Buscando endereço..." : cepStatus === "partial" ? "CEP encontrado. Complete os campos do endereço que não foram preenchidos automaticamente." : cepStatus === "error" ? "Não foi possível buscar o CEP. Preencha o endereço manualmente." : ""}</p>
                  {cepStatus === "ready" ? <div className={styles.addressCard}><MapPin aria-hidden="true" /><div><span>{address.street}</span><b>CEP {cep} - {address.neighborhood}</b><span>{address.city} - {address.state}</span></div><button type="button" onClick={changeCep}>Alterar</button></div> : cepStatus === "partial" || cepStatus === "error" ? <div className={styles.addressEdit}><input className={styles.input} value={address.street} onChange={e => updateAddress("street", e.target.value)} placeholder="Rua / Endereço" aria-label="Endereço" autoComplete="address-line1" required /><input className={styles.input} value={address.neighborhood} onChange={e => updateAddress("neighborhood", e.target.value)} placeholder="Bairro" aria-label="Bairro" required /><input className={styles.input} value={address.city} onChange={e => updateAddress("city", e.target.value)} placeholder="Cidade" aria-label="Cidade" autoComplete="address-level2" required /><input className={styles.input} value={address.state} onChange={e => updateAddress("state", e.target.value.toUpperCase().slice(0,2))} placeholder="Estado" aria-label="Estado" autoComplete="address-level1" maxLength={2} required /></div> : null}
                  <div className={styles.numberField}><input ref={addressNumberInput} className={styles.input} value={address.number} disabled={withoutNumber} onChange={e => updateAddress("number", e.target.value)} placeholder="Número" autoComplete="address-line2" aria-label="Número" /><label><input type="checkbox" checked={withoutNumber} onChange={e => { setWithoutNumber(e.target.checked); if (e.target.checked) updateAddress("number", ""); }} /> Sem número</label></div>
                  <input className={styles.input} value={address.complement} onChange={e => updateAddress("complement", e.target.value)} placeholder="Apto, Bloco, Referência, etc. (opcional)" aria-label="Complemento" />
                  <div className={styles.invoiceData}><h3>Dados para nota fiscal <CircleHelp aria-label="Informações da nota fiscal" /></h3><input ref={documentInput} className={styles.input} value={documentNumber} onChange={e => { setDocumentNumber(formatDocument(e.target.value)); if (error) setError(""); }} placeholder="CPF ou CNPJ" inputMode="numeric" aria-label="CPF ou CNPJ" aria-invalid={Boolean(error && /CPF|CNPJ|documento/i.test(error))} /><label className={styles.sameData}><input type="checkbox" checked={sameInvoiceData} onChange={e => setSameInvoiceData(e.target.checked)} /> Usar as mesmas informações da entrega</label></div>
                </div>}
              </section>
              {error && <p className={styles.error}>{error}</p>}<button className={styles.continue} type="submit">Continuar para pagamento</button>
            </form>
          ) : (
            <section className={styles.payment}>
              <div className={styles.trackingNotice}>Depois que o pedido for despachado, o código de rastreamento será enviado ao e-mail informado na compra. Confira também as pastas de spam e lixeira.</div>
              <div className={styles.checkoutReview}>
                <div className={styles.reviewRow}><Mail aria-hidden="true" /><span>{email}</span></div>
                <div className={styles.reviewRow}><MapPin aria-hidden="true" /><span>{address.street}, {withoutNumber ? "S/N" : address.number}{address.complement ? `, ${address.complement}` : ""}<small>CEP {cep.slice(0,5)}-{cep.slice(5)} · {address.neighborhood}<br />{address.city} - {address.state}</small></span><button type="button" onClick={() => { setStep(2); window.scrollTo({top:0,behavior:"smooth"}); }}>Alterar</button></div>
                <div className={styles.reviewRow}><Truck aria-hidden="true" /><span><b>Correios - {shippingMethod === "pac" ? "PAC" : "SEDEX"} · {shippingFeeCents ? money.format(shippingFeeCents/100) : "Grátis"}</b><small>Chega em {deliveryDate(shippingMethod === "pac" ? 25 : 13)}</small></span><button type="button" onClick={() => { setDraftShipping(shippingMethod ?? "pac"); setShippingModalOpen(true); }}>Alterar</button></div>
              </div>
              {!paymentExpanded ? <><h1>Forma de pagamento</h1><div className={styles.paymentOptions} role="radiogroup" aria-label="Forma de pagamento">
                {cartaoDisponivel
                  ? <button type="button" role="radio" aria-checked="false" onClick={() => { setPayment("card"); setPaymentExpanded(true); setPaymentError(""); }}><CreditCard /><span><b>Cartão de crédito</b><small>Até 4x sem juros ou {gatewayConfig?.parcelas ?? 12}x com juros</small></span><ChevronRight /></button>
                  : <button type="button" className={styles.opcaoManutencao} disabled aria-disabled="true"><CreditCard /><span><b>Cartão de crédito</b><small>{gatewayConfigStatus === "loading" ? "Verificando disponibilidade…" : gatewayConfig?.cartao === "sandbox" ? "Modo de teste — indisponível para compras" : "Indisponível no momento"}</small></span><em className={styles.selo}>{gatewayConfigStatus === "loading" ? "Aguarde" : "Indisponível"}</em></button>}
                <button type="button" role="radio" aria-checked="false" onClick={() => { setPayment("pix"); setPaymentExpanded(true); setPaymentError(""); }}><PixLogo /><span><b>Pix</b><small>Aprovação rápida</small></span><em className={styles.pixOff}>{Math.round(DESCONTO_PIX * 100)}% OFF</em><ChevronRight /></button>
              </div></> : <div className={styles.paymentDetail}>
                <header><button type="button" aria-label="Voltar às formas de pagamento" onClick={() => { setPaymentExpanded(false); setPaymentError(""); }}><ArrowLeft /></button><span>{payment === "pix" ? <PixLogo /> : <CreditCard />}<b>{payment === "pix" ? "Pix" : "Cartão de crédito"}</b></span></header>
                {payment === "pix" ? <>
                  {!pixCharge && <div className={styles.pixInstructions}><PixLogo /><p>Ao gerar o Código Pix do pedido você pode pagar escaneando o <b>QR Code</b> ou <b>Copiar e Colar</b>.</p></div>}
                  {pixCharge && <div className={styles.pixResult} role="status"><h2>PIX gerado com sucesso</h2><p>Pedido <b>{pixCharge.pedido}</b> · valor <b>{money.format(pixCharge.total / 100)}</b></p>{pixCharge.qr_code_url && <Image className={styles.qr} src={pixCharge.qr_code_url} alt="QR Code PIX" width={220} height={220} unoptimized />}<label>Código PIX copia e cola<textarea readOnly value={pixCharge.qr_code} /></label><button className={styles.copyButton} type="button" onClick={copyPix}>{copied ? "Código copiado!" : "Copiar código PIX"}</button></div>}
                </> : cartaoDisponivel && gatewayConfig?.publicKey
                  ? <CartaoAxxon publicKey={gatewayConfig.publicKey} parcelasMax={gatewayConfig.parcelas ?? 1} total={totalCents} payload={{ ...paymentPayload, produto: cartKey }} produtoNome={productName} onEnviado={() => { finalizado.current = true; abandonoPendente.current = null; }} onDocumentoRecusado={mensagem => {
                      setStep(2); setPaymentExpanded(false); setPaymentError(""); setError(mensagem);
                      window.setTimeout(() => {
                        documentInput.current?.focus({ preventScroll: true });
                        documentInput.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }, 0);
                    }} />
                  : <p>Cartão indisponível no momento. Nenhum dado de cartão foi solicitado.</p>}
                <button className={styles.changePayment} type="button" onClick={() => setPaymentExpanded(false)}>Alterar forma de pagamento</button>
              </div>}
              <SavedPaymentData checked={savePaymentData} onChecked={setSavePaymentData} onAlter={() => { setStep(2); setPaymentExpanded(false); }} />
              {!paymentExpanded ? <button className={`${styles.payButton} ${styles.payButtonInactive}`} type="button" disabled>Fazer pedido</button> : payment === "pix" ? !pixCharge && <button className={styles.payButton} type="button" disabled={generatingPix} onClick={generatePix}>{generatingPix ? "Gerando PIX..." : "Fazer pedido"}</button> : null}
              {paymentError && <p className={styles.paymentError} role="alert">{paymentError}</p>}
            </section>
          )}
        </main>
        <aside className={`${styles.summary} ${summaryOpen ? styles.summaryOpen : ""}`}><OrderSummary products={products} shippingMethod={shippingMethod} shippingFeeCents={shippingFeeCents} descontos={descontos} /><div className={styles.desktopCoupon}><Coupon couponOpen={couponOpen} setCouponOpen={setCouponOpen} coupon={coupon} setCoupon={setCoupon} applyCoupon={applyCoupon} message={couponMessage} /></div></aside>
      </div>
      {shippingModalOpen && <div className={styles.shippingModalBackdrop} role="presentation" onMouseDown={() => setShippingModalOpen(false)}><div className={styles.shippingModal} role="dialog" aria-modal="true" aria-labelledby="shipping-modal-title" onMouseDown={event => event.stopPropagation()}><span className={styles.modalHandle} aria-hidden="true" /><header><div><h2 id="shipping-modal-title">Entrega</h2><p>Escolha como deseja receber seu pedido</p></div><button type="button" aria-label="Fechar" onClick={() => setShippingModalOpen(false)}><X /></button></header><div className={styles.shippingModalBody}><b><Truck aria-hidden="true" /> Envio em domicílio</b><label className={draftShipping === "pac" ? styles.shippingModalSelected : ""}><input type="radio" name="modal-shipping" checked={draftShipping === "pac"} onChange={() => setDraftShipping("pac")} /><span><b>Correios - PAC</b><small>Chega em {deliveryDate(25)}</small></span><strong>Grátis<small>R$ 20,32</small></strong></label><label className={draftShipping === "sedex" ? styles.shippingModalSelected : ""}><input type="radio" name="modal-shipping" checked={draftShipping === "sedex"} onChange={() => setDraftShipping("sedex")} /><span><b>Correios - SEDEX</b><small>Chega em {deliveryDate(13)}</small></span><strong>R$ 20,32</strong></label></div><div className={styles.shippingModalActions}><button className={styles.shippingSave} type="button" onClick={() => { setShippingMethod(draftShipping); setShippingModalOpen(false); }}>Salvar forma de entrega</button><button className={styles.shippingCancel} type="button" onClick={() => setShippingModalOpen(false)}>Cancelar</button></div></div></div>}
      {!cupomAplicado && cupomValidoCarrinho(CUPOM_SAIDA, products.map((item) => item.slug)) ? (
        <ExitOffer
          codigoDoCupom={CUPOM_SAIDA}
          percentual={DESCONTO_SAIDA}
          chaveSessao="cdp-oferta-saida-checkout"
          descricao="Aplique o cupom na sua Box Café com Deus Pai 2027. No Pix, ele ainda soma com o desconto da forma de pagamento."
          onAplicar={aplicarCupomSaida}
        />
      ) : null}
      {generatingPix && (
        <div className={styles.pixGeneratingOverlay} role="status" aria-live="polite" aria-label={pixStage === "pronto" ? "PIX gerado" : "Gerando PIX"}>
          <div className={`${styles.pixGeneratingCard} ${pixStage === "pronto" ? styles.pixGeneratingReady : ""}`}>
            <span className={styles.pixGeneratingIcon} aria-hidden="true">
              {pixStage === "pronto" ? <Check /> : <PixLogo />}
            </span>
            <strong>{pixStage === "pronto" ? "PIX gerado com sucesso!" : "Preparando seu PIX…"}</strong>
            <p>{pixStage === "pronto" ? "Abrindo a tela para copiar o código." : "Estamos criando o código seguro do seu pedido."}</p>
            <span className={styles.pixGeneratingTrack} aria-hidden="true"><i /></span>
            <small>Não feche esta página</small>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderSummary({ products, shippingMethod, shippingFeeCents, descontos }: { products: CheckoutProduct[]; shippingMethod: "pac" | "sedex" | null; shippingFeeCents: number; descontos: Descontos }) {
  const subtotalCents = products.reduce((sum, product) => sum + product.priceCents * product.quantity, 0);
  const price = money.format(subtotalCents / 100);
  const total = money.format((subtotalCents - descontos.totalCentavos + shippingFeeCents) / 100);
  return <div><div className={styles.orderItems}>{products.map((product) => <div className={styles.product} key={product.slug}><Image src={product.image} alt={product.name} width={128} height={128} /><div><b>{product.name} × {product.quantity}</b></div><div className={styles.productPrice}>{product.originalPrice && product.quantity === 1 && <span><s>{product.originalPrice}</s></span>}<strong>{money.format(product.priceCents * product.quantity / 100)}</strong></div></div>)}</div>
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

function SavedPaymentData({ checked, onChecked, onAlter }: { checked: boolean; onChecked: (value: boolean) => void; onAlter: () => void }) {
  return <><div className={styles.savePayment}><label><input type="checkbox" checked={checked} onChange={e => onChecked(e.target.checked)} /> Salvar contato para <b>comprar mais rápido</b></label><p>O e-mail e o telefone serão preenchidos automaticamente neste navegador. Dados do cartão, CPF e endereço não são salvos aqui. <button type="button" onClick={onAlter}>Alterar contato</button></p><span><LockKeyhole /> Compra segura <small>☁ nuvem</small></span></div><p className={styles.saveTerms}>Ao salvar, você aceita os <Link href="/termos-de-uso">Termos de uso</Link> e a <Link href="/politica-de-privacidade">Política de Privacidade</Link></p></>;
}

type CouponProps={couponOpen:boolean;setCouponOpen:(v:boolean)=>void;coupon:string;setCoupon:(v:string)=>void;applyCoupon:()=>void;message:string};
function Coupon({couponOpen,setCouponOpen,coupon,setCoupon,applyCoupon,message}:CouponProps){return <div className={styles.coupon}><button type="button" onClick={()=>setCouponOpen(!couponOpen)}>Adicionar cupom de desconto</button>{couponOpen&&<div className={styles.couponForm}><input value={coupon} onChange={e=>setCoupon(e.target.value)} placeholder="Código do cupom"/><button type="button" onClick={applyCoupon}>Aplicar</button>{message&&<small>{message}</small>}</div>}</div>}
