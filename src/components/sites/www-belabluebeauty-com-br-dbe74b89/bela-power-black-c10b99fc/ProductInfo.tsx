"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { gravarCarrinho } from "./cart";
import { IMG, kits, produto } from "./data";
import KitSelector from "./KitSelector";
import ShippingCalculator from "./ShippingCalculator";
import { HeartIcon, Stars } from "./icons";
import { useStock } from "./StockContext";
import s from "./styles.module.css";

/* div.detalhes — 560px, sticky top 112px, padding-left 59px, margin-bottom 30px */
const share = [
  { img: `${IMG}/30-compartilhar-no-facebook.svg`, alt: "Compartilhar no Facebook", bg: "#1877f2" },
  { img: `${IMG}/31-compartilhar-no-x.svg`, alt: "Compartilhar no X", bg: "#000000" },
  { img: `${IMG}/32-compartilhar-no-whatsapp.svg`, alt: "Compartilhar no WhatsApp", bg: "#25d366" },
];

/* Começa no mesmo valor no servidor e no cliente (hidratação determinística);
   só o intervalo altera o estado depois. */
function useTimer(segIniciais: number) {
  const [t, setT] = useState(segIniciais);
  useEffect(() => {
    const id = setInterval(() => setT((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);
  const h = String(Math.floor(t / 3600)).padStart(2, "0");
  const m = String(Math.floor((t % 3600) / 60)).padStart(2, "0");
  const sec = String(t % 60).padStart(2, "0");
  return `${h}h ${m}m ${sec}s`;
}

export default function ProductInfo() {
  const restante = useTimer(2 * 3600 + 29 * 60 + 51);
  const [qtd, setQtd] = useState(1);
  const [kitSel, setKitSel] = useState(() => Math.max(0, kits.findIndex((k) => k.ativo)));
  const { estoque } = useStock();
  const router = useRouter();
  const comprarRef = useRef<HTMLDivElement>(null);
  const [barraFixa, setBarraFixa] = useState(false);

  /* a barra do rodapé entra quando o botão principal sai da tela */
  useEffect(() => {
    const alvo = comprarRef.current;
    if (!alvo) return;
    const obs = new IntersectionObserver(([e]) => setBarraFixa(!e.isIntersecting), { rootMargin: "0px 0px -80px 0px" });
    obs.observe(alvo);
    return () => obs.disconnect();
  }, []);

  /* guarda a escolha e leva para o checkout */
  function comprar() {
    gravarCarrinho({ kitIndex: kitSel, qtd });
    router.push("/checkout");
  }
  const pctEstoque = Math.max(4, Math.min(100, estoque));

  return (
    <div className={s.detalhes}>
      <div className={s.tituloLinha}>
        <h1 className={s.nomeProduto}>{produto.nome}</h1>
        <button className={s.wishBtn} aria-label="Adicionar aos favoritos"><HeartIcon /></button>
      </div>

      <div className={s.grupoReviews}>
        <span className={s.rating}>
          <strong className={s.ratingNota}>{produto.nota}</strong>
          <Stars nota={5} />
          <span className={s.ratingQtd}>({produto.avaliacoes})</span>
        </span>
      </div>

      <p className={s.precoDe}>de <s>{produto.de}</s> por</p>
      <p className={s.valor}>{produto.por}</p>

      <p>
        <span className={s.pixPill}>
          <Image src={`${IMG}/61-pix.png`} alt="PIX" width={26} height={14} sizes="26px" />
          {produto.pix}
          <span className={s.envioBadge}>+ Envio Prioritário</span>
        </span>
      </p>

      <div className={s.economia}>{produto.economia}</div>
      <p className={s.disponibilidade}>{produto.disponibilidade}</p>

      {/* .items-count + .progressbar do original */}
      <div className={s.itemsCount} suppressHydrationWarning>
        <p>QUEIMA TOTAL: ÚLTIMAS <b><span className={s.count}>{estoque}</span></b> UNIDADES</p>
        <div className={s.progressbar}><div style={{ width: `${pctEstoque}%` }} /></div>
      </div>

      <div className={s.contador}>
        <p suppressHydrationWarning>⏱ Oferta termina em {restante}</p>
      </div>

      <KitSelector sel={kitSel} onSelect={setKitSel} />

      <div className={s.comprarLinha} ref={comprarRef}>
        <div className={s.qtdBox}>
          <input className={s.qtdInput} value={qtd} aria-label="Quantidade"
            onChange={(e) => setQtd(Math.max(1, Number(e.target.value) || 1))} />
          <span className={s.qtdBtns}>
            <button onClick={() => setQtd((q) => q + 1)} aria-label="Aumentar quantidade">▲</button>
            <button onClick={() => setQtd((q) => Math.max(1, q - 1))} aria-label="Diminuir quantidade">▼</button>
          </span>
        </div>
        <button className={s.btComprar} onClick={comprar}>Comprar agora</button>
      </div>

      <ShippingCalculator />

      <div className={s.social}>
        <span>Compartilhe:</span>
        {share.map((sh) => (
          <button key={sh.alt} type="button" aria-label={sh.alt} className={s.socialBtn} style={{ background: sh.bg }}>
            {/* SVGs de marca — servidos direto, já são leves */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sh.img} alt="" width={13} height={13} loading="lazy" />
          </button>
        ))}
      </div>


      {/* barra fixa de compra — seletor de kit + preço do kit escolhido */}
      <div className={`${s.barraCompra} ${barraFixa ? s.barraCompraVisivel : ""}`} aria-hidden={!barraFixa}>
        <div className={`bb-container ${s.barraCompraInner}`}>
          <span className={s.barraInfo}>
            <span className={s.barraKit}>
              {kits[kitSel].nome}
              {kits[kitSel].desconto && <span className={s.barraOff}>{kits[kitSel].desconto}</span>}
            </span>
            <span className={s.barraPrecoLinha}>
              {kits[kitSel].de && <span className={s.barraDe}>{kits[kitSel].de}</span>}
              <span className={s.barraPreco}>{kits[kitSel].total}</span>
            </span>
          </span>

          <span className={s.barraSeletor} role="radiogroup" aria-label="Escolha a quantidade de potes">
            {kits.map((k, i) => (
              <button
                key={k.nome}
                type="button"
                role="radio"
                aria-checked={i === kitSel}
                tabIndex={barraFixa ? 0 : -1}
                onClick={() => setKitSel(i)}
                className={`${s.barraOpcao} ${i === kitSel ? s.barraOpcaoAtiva : ""}`}
              >
                <span className={s.barraOpcaoNum}>{i + 1}</span>
                <span className={s.barraOpcaoTxt}>{i === 0 ? "pote" : "potes"}</span>
              </button>
            ))}
          </span>

          <button className={s.btComprar} onClick={comprar} tabIndex={barraFixa ? 0 : -1}>Comprar agora</button>
        </div>
      </div>
    </div>
  );
}
