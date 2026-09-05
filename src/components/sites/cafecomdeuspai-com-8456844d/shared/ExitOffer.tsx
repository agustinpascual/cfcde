"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import styles from "./ExitOffer.module.css";

type Props = {
  codigoDoCupom: string;
  percentual: number;
  /* Pacote que o botão do pop-up leva para o checkout. */
  slug: string;
};

const CHAVE_SESSAO = "cdp-oferta-saida";
const CHAVE_CUPOM = "cdp-cupom";

export default function ExitOffer({ codigoDoCupom: cupom, percentual, slug }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const abrir = useCallback(() => {
    try {
      if (sessionStorage.getItem(CHAVE_SESSAO)) return false;
      sessionStorage.setItem(CHAVE_SESSAO, "1");
    } catch {}
    setAberto(true);
    return true;
  }, []);

  useEffect(() => {
    try { if (sessionStorage.getItem(CHAVE_SESSAO)) return; } catch {}

    /* Desktop: o ponteiro sair pela borda de cima é a intenção de fechar a aba. */
    const saiuPorCima = (evento: MouseEvent) => {
      if (evento.clientY <= 0 && !evento.relatedTarget) abrir();
    };

    /* Mobile e botão voltar: uma entrada extra no histórico segura a primeira
       tentativa de sair e mostra a oferta. A segunda passa — navegador nenhum
       deixa prender de verdade, e insistir só faz a pessoa fechar a aba. */
    let segurando = false;
    try {
      history.pushState({ cdpOferta: true }, "", window.location.href);
      segurando = true;
    } catch {}

    const aoVoltar = () => {
      if (!segurando) return;
      segurando = false;
      if (abrir()) {
        try { history.pushState({ cdpOferta: true }, "", window.location.href); segurando = true; } catch {}
      }
    };

    document.addEventListener("mouseout", saiuPorCima);
    window.addEventListener("popstate", aoVoltar);
    return () => {
      document.removeEventListener("mouseout", saiuPorCima);
      window.removeEventListener("popstate", aoVoltar);
    };
  }, [abrir]);

  useEffect(() => {
    if (!aberto) return;
    const fechaNoEsc = (evento: KeyboardEvent) => { if (evento.key === "Escape") setAberto(false); };
    window.addEventListener("keydown", fechaNoEsc);
    return () => window.removeEventListener("keydown", fechaNoEsc);
  }, [aberto]);

  function guardarCupom() {
    try { localStorage.setItem(CHAVE_CUPOM, cupom); } catch {}
  }

  async function copiar() {
    guardarCupom();
    try { await navigator.clipboard.writeText(cupom); setCopiado(true); } catch {}
  }

  function irParaOCheckout() {
    guardarCupom();
    router.push(`/checkout?produto=${encodeURIComponent(slug)}&cupom=${encodeURIComponent(cupom)}`);
  }

  if (!aberto) return null;

  return (
    <div className={styles.fundo} role="dialog" aria-modal="true" aria-labelledby="oferta-saida-titulo">
      <div className={styles.caixa}>
        <button className={styles.fechar} type="button" onClick={() => setAberto(false)} aria-label="Fechar">×</button>
        <span className={styles.selo}>Espere um instante</span>
        <h2 className={styles.titulo} id="oferta-saida-titulo">Você ganhou {percentual}% de desconto</h2>
        <p className={styles.texto}>
          Use o cupom abaixo na finalização da compra do Lançamento Combo Plus 2027.
          Some com os 5% do Pix.
        </p>
        <div className={styles.cupom}>
          <span className={styles.codigo}>{cupom}</span>
          <button className={styles.copiar} type="button" onClick={copiar}>
            {copiado ? "copiado!" : "copiar"}
          </button>
        </div>
        <button className={styles.usar} type="button" onClick={irParaOCheckout}>
          Usar meu desconto
        </button>
        <button className={styles.recusar} type="button" onClick={() => setAberto(false)}>
          Continuar navegando
        </button>
      </div>
    </div>
  );
}
