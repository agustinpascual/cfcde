"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { StaticImageData } from "next/image";
import { useRouter } from "next/navigation";
import { Star, Minus, Plus, ShieldCheck, ShoppingCart, Truck } from "lucide-react";
import frontal15m from "@/lib/1-frontal.jpg";
import frontal25m from "@/lib/1-frontal (1).jpg";
import frontal50m from "@/lib/1-frontal (2).jpg";
import { FacebookIcon, WhatsAppIcon, XIcon } from "./icons";
import { RATING, TOTAL_REVIEWS } from "./reviewsData";

type Kit = {
  id: number;
  name: string;
  duration: string;
  de: number | null;
  total: number;
  savings: number | null;
  badge: string | null;
  ribbon: string | null;
  bonus: string | null;
  image: StaticImageData;
};

const KITS: Kit[] = [
  {
    id: 1,
    name: "Alcance: 15 Metros",
    duration: "",
    de: 89.9,
    total: 67.9,
    savings: null,
    badge: null,
    ribbon: null,
    bonus: null,
    image: frontal15m,
  },
  {
    id: 2,
    name: "Alcance: 25 Metros ",
    duration: "",
    de: 179.8,
    total: 87.9,
    savings: 59.9,
    badge: "33% OFF",
    ribbon: "MAIS VENDIDO · RECOMENDADO",
    bonus: "+ Carregador",
    image: frontal25m,
  },
  {
    id: 3,
    name: "Alcance: 50 Metros",
    duration: "",
    de: 269.7,
    total: 149.9,
    savings: 119.8,
    badge: "48% OFF",
    ribbon: "OPÇÃO MAIS ECONÔMICA",
    bonus: "+ Carregador + Estojo",
    image: frontal50m,
  },
];

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const LOTE_TOTAL = 20;
const UNIDADES_RESTANTES = 3;

function useOfferCountdown() {
  const durationMs = 27 * 60 * 1000;
  const [remaining, setRemaining] = useState(durationMs);
  useEffect(() => {
    const saved = Number(window.localStorage.getItem("nodentec:offer-ends"));
    const target = saved > Date.now() ? saved : Date.now() + durationMs;
    window.localStorage.setItem("nodentec:offer-ends", String(target));
    const tick = () => setRemaining(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const s = Math.floor(remaining / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}h ${m}m ${sec}s`;
}

type BuyBoxProps = {
  selected: number;
  onSelect: (id: number) => void;
};

type CepResult = {
  city: string;
  state: string;
};

export function BuyBox({ selected, onSelect }: BuyBoxProps) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [cep, setCep] = useState("");
  const [cepResult, setCepResult] = useState<CepResult | null>(null);
  const [cepError, setCepError] = useState("");
  const [isCheckingCep, setIsCheckingCep] = useState(false);
  const [shippingMethod, setShippingMethod] = useState<"economic" | "priority">("economic");
  const kit = useMemo(() => KITS.find((k) => k.id === selected)!, [selected]);
  const pixPrice = kit.total * 0.95;
  const timeLeft = useOfferCountdown();

  useEffect(() => {
    const savedQty = Number(window.localStorage.getItem("nodentec:quantity"));
    const savedModel = Number(window.localStorage.getItem("nodentec:model"));
    const id = window.setTimeout(() => {
      if (Number.isInteger(savedQty) && savedQty >= 1 && savedQty <= 8) setQty(savedQty);
      if (KITS.some((item) => item.id === savedModel)) onSelect(savedModel);
    }, 0);
    return () => window.clearTimeout(id);
  }, [onSelect]);

  useEffect(() => {
    window.localStorage.setItem("nodentec:quantity", String(qty));
    window.localStorage.setItem("nodentec:model", String(selected));
  }, [qty, selected]);

  const handleCepChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    setCep(digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits);
    setCepResult(null);
    setCepError("");
  };

  const handleCepSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const digits = cep.replace(/\D/g, "");

    if (digits.length !== 8) {
      setCepError("Digite um CEP válido com 8 números.");
      setCepResult(null);
      return;
    }

    setIsCheckingCep(true);
    setCepError("");
    setCepResult(null);

    try {
      const response = await fetch(`/api/cep?cep=${digits}`);
      const data = (await response.json()) as CepResult & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível consultar o CEP.");
      }

      setCepResult(data);
    } catch (error) {
      setCepError(error instanceof Error ? error.message : "Não foi possível consultar o CEP.");
    } finally {
      setIsCheckingCep(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold tracking-wide text-[var(--bb-muted)] uppercase">

        </p>
        <h1 className="mt-1 font-heading text-2xl font-bold text-[var(--bb-black)] sm:text-[28px]">
          Amplificador para bloqueio de sinal Bluetooth
        </h1>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex items-center gap-0.5 text-[var(--bb-star)]">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4" fill="currentColor" strokeWidth={0} />
            ))}
          </div>
          <span className="text-sm font-bold text-[var(--bb-black)]">{RATING}</span>
          <a href="#avaliacoes" className="text-sm text-[var(--bb-muted)] underline underline-offset-2">
            {TOTAL_REVIEWS.toLocaleString("pt-BR")} avaliações
          </a>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--bb-border)] bg-[var(--bb-gray-bg)] p-4">
        <div className="flex flex-wrap items-baseline gap-2">
          {kit.de && (
            <span className="text-sm text-[var(--bb-muted)] line-through">de {money(kit.de)}</span>
          )}
          <span className="text-[13px] font-semibold text-[var(--bb-orange)]">por</span>
        </div>
        <div className="mt-0.5 flex items-baseline gap-3">
          <span className="font-heading text-[34px] leading-none font-extrabold text-[var(--bb-black)]">
            {money(kit.total)}
          </span>
          {kit.savings && (
            <span className="rounded-full bg-[var(--bb-orange-light)] px-2.5 py-1 text-xs font-bold text-[var(--bb-orange-dark)]">
              Economize {money(kit.savings)}
            </span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-[var(--bb-text-2)]">
            <b className="font-bold text-[var(--bb-black)]">{money(pixPrice)}</b> no PIX
          </span>
          <span className="rounded-md bg-[var(--bb-black)] px-2 py-0.5 text-[11px] font-bold text-white">
            Envio Prioritário
          </span>
        </div>
      </div>

      <div className="nodentec-offer-status">
        <div className="nodentec-stock-copy"><span><i />Lote promocional quase esgotado</span><strong>Restam {UNIDADES_RESTANTES} unidades</strong></div>
        <div className="nodentec-stock-track" role="progressbar" aria-label="Disponibilidade do lote promocional" aria-valuemin={0} aria-valuemax={LOTE_TOTAL} aria-valuenow={UNIDADES_RESTANTES}><span style={{ width: `${(UNIDADES_RESTANTES / LOTE_TOTAL) * 100}%` }} /></div>
        <div className="nodentec-offer-time"><span>⏱ Oferta termina em</span><strong>{timeLeft}</strong></div>
      </div>

      <div>
        <div className="nodentec-model-heading"><p>Escolha o seu <strong>MODELO IDEAL</strong></p></div>
        <div className="nodentec-model-list">
          {KITS.map((k) => (
            <button
              key={k.id}
              onClick={() => onSelect(k.id)}
              className={`nodentec-model-card ${
                selected === k.id
                  ? "nodentec-model-card--selected"
                  : ""
              }`}
            >
              {k.ribbon && (
                <span className="nodentec-model-ribbon">
                  {k.ribbon}
                </span>
              )}
              <div className="nodentec-model-image">
                <Image src={k.image} alt={k.name} width={64} height={64} className="h-full w-full object-contain" />
              </div>
              <div className="nodentec-model-info">
                <div className="flex items-center gap-2">
                  <span className="font-heading text-sm font-bold text-[var(--bb-black)]">{k.name}</span>
                  {k.badge && (
                    <span className="rounded bg-[var(--bb-orange)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {k.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[var(--bb-muted)]">{k.duration}</p>
                {k.bonus && <p className="text-[11px] font-semibold text-[var(--bb-orange-dark)]">{k.bonus}</p>}
              </div>
              <div className="nodentec-model-price">
                {k.de && (
                  <p className="text-[11px] text-[var(--bb-muted)] line-through">{money(k.de)}</p>
                )}
                <p className="font-heading text-base font-extrabold text-[var(--bb-black)]">{money(k.total)}</p>
              </div>
              <span
                className={`ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  selected === k.id ? "border-[var(--bb-orange)] bg-[var(--bb-orange)]" : "border-[var(--bb-border)]"
                }`}
              >
                {selected === k.id && <span className="h-2 w-2 rounded-full bg-white" />}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="nodentec-purchase-actions">
        <div className="nodentec-quantity-control">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="flex h-11 w-11 items-center justify-center text-[var(--bb-black)] transition-colors hover:text-[var(--bb-orange)]"
            aria-label="Diminuir quantidade"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-8 text-center text-sm font-bold tabular-nums">{qty}</span>
          <button
            onClick={() => setQty((q) => Math.min(8, q + 1))}
            className="flex h-11 w-11 items-center justify-center text-[var(--bb-black)] transition-colors hover:text-[var(--bb-orange)]"
            aria-label="Aumentar quantidade"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams({
              model: String(selected),
              qty: String(qty),
              shipping: shippingMethod,
            });
            const cepDigits = cep.replace(/\D/g, "");
            if (cepDigits.length === 8) params.set("cep", cepDigits);
            router.push(`/checkout?${params.toString()}`);
          }}
          className="nodentec-buy-button"
        >
          <ShoppingCart aria-hidden="true" />
          <span><strong>Comprar agora</strong><small>{qty > 1 ? `${qty} × ${money(kit.total)}` : money(kit.total)}</small></span>
        </button>
      </div>

      <div className="rounded-2xl border border-[var(--bb-border)] bg-[var(--bb-gray-bg)] p-4">
        <p className="mb-2.5 flex items-center gap-1.5 text-[13px] font-bold text-[var(--bb-black)]">
          <Truck className="h-4 w-4 text-[var(--bb-muted)]" aria-hidden="true" /> Calcular frete e prazo
        </p>
        <form className="nodentec-shipping-form flex gap-2" onSubmit={handleCepSubmit}>
          <input
            value={cep}
            onChange={(e) => handleCepChange(e.target.value)}
            placeholder="Digite seu CEP"
            inputMode="numeric"
            autoComplete="postal-code"
            aria-label="CEP"
            className="h-11 flex-1 min-w-0 rounded-lg border border-[var(--bb-border)] bg-white px-3.5 text-sm outline-none transition-colors focus:border-[var(--bb-orange)]"
          />
          <button
            type="submit"
            disabled={isCheckingCep}
            className="nodentec-shipping-button h-11 shrink-0 rounded-lg px-5 text-sm font-bold tracking-wide disabled:cursor-wait disabled:opacity-60"
          >
            {isCheckingCep ? "Consultando…" : "Calcular"}
          </button>
        </form>
        <div aria-live="polite">
          {cepResult && (
            <div className="mt-3">
              <p className="mb-2 text-sm font-semibold text-[var(--bb-orange-dark)]">
                Entrega para {cepResult.city} - {cepResult.state}
              </p>
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => setShippingMethod("economic")}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                    shippingMethod === "economic"
                      ? "border-[var(--bb-orange)] bg-[var(--bb-orange-light)]/40"
                      : "border-[var(--bb-border)]"
                  }`}
                >
                  <Truck className="h-5 w-5 shrink-0 text-[var(--bb-orange)]" />
                  <span className="flex-1">
                    <span className="block text-sm font-bold text-[var(--bb-black)]">Envio Econômico</span>
                    <span className="block text-xs text-[var(--bb-muted)]">Entrega de 15 a 30 dias úteis</span>
                  </span>
                  <span className="text-sm font-extrabold text-emerald-700">Grátis</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShippingMethod("priority")}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                    shippingMethod === "priority"
                      ? "border-[var(--bb-orange)] bg-[var(--bb-orange-light)]/40"
                      : "border-[var(--bb-border)]"
                  }`}
                >
                  <Truck className="h-5 w-5 shrink-0 text-[var(--bb-orange)]" />
                  <span className="flex-1">
                    <span className="block text-sm font-bold text-[var(--bb-black)]">Envio Prioritário</span>
                    <span className="block text-xs text-[var(--bb-muted)]">Entrega de 6 a 11 dias úteis</span>
                  </span>
                  <span className="text-sm font-extrabold text-[var(--bb-black)]">R$ 13,43</span>
                </button>
              </div>
            </div>
          )}
          {cepError && <p className="mt-2 text-sm text-red-600">{cepError}</p>}
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--bb-muted)]">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Processado com segurança por Stone</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-[var(--bb-muted)]">Compartilhar:</span>
        <div className="flex items-center gap-2">
          {[FacebookIcon, XIcon, WhatsAppIcon].map((Icon, i) => (
            <button
              key={i}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bb-gray-bg)] text-[var(--bb-black)] transition-colors hover:bg-[var(--bb-orange-light)] hover:text-[var(--bb-orange)]"
              aria-label="Compartilhar"
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
