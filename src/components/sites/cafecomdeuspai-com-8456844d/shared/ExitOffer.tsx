"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import styles from "./ExitOffer.module.css";

type Props = {
  codigoDoCupom: string;
  percentual: number;
  /* Pacote que o botão do pop-up leva para o checkout. */
  slug?: string;
  onAplicar?: () => void;
  descricao?: string;
  chaveSessao?: string;
};

const CHAVE_SESSAO = "cdp-oferta-saida";
const CHAVE_CUPOM = "cdp-cupom";

export default function ExitOffer({
  codigoDoCupom: cupom,
  percentual,
  slug,
  onAplicar,
  descricao,
  chaveSessao = CHAVE_SESSAO,
}: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const abrir = useCallback(() => {
    try {
      if (sessionStorage.getItem(chaveSessao)) return false;
      sessionStorage.setItem(chaveSessao, "1");
    } catch {}
    setAberto(true);
    return true;
  }, [chaveSessao]);

  useEffect(() => {
    try { if (sessionStorage.getItem(chaveSessao)) return; } catch {}

    /* Não existe relógio: tempo na página nunca é intenção de saída.
       No desktop, só arma depois que um mouse real entrou no conteúdo e só
       abre quando esse mouse cruza a borda superior para fora da janela. */
    const ponteiroPreciso = window.matchMedia("(pointer: fine)").matches;
    const ponteiroGrosso = window.matchMedia("(pointer: coarse)").matches;
    let mouseDentroDoConteudo = false;
    let segurando = false;

    const registrarMovimento = (evento: PointerEvent) => {
      if (evento.pointerType === "mouse" && evento.clientY > 80) mouseDentroDoConteudo = true;
    };

    /* Desktop: o ponteiro sair pela borda de cima é a intenção de fechar a aba. */
    const saiuPorCima = (evento: MouseEvent) => {
      if (!ponteiroPreciso || !mouseDentroDoConteudo || document.visibilityState !== "visible") return;
      if (evento.clientY <= 0 && !evento.relatedTarget) abrir();
    };

    /* Mobile e botão voltar: uma entrada extra no histórico segura a primeira
       tentativa de sair e mostra a oferta. A segunda passa — navegador nenhum
       deixa prender de verdade, e insistir só faz a pessoa fechar a aba. */
    const aoVoltar = () => {
      if (!segurando) return;
      segurando = false;
      if (abrir()) {
        try { history.pushState({ cdpOferta: true }, "", window.location.href); segurando = true; } catch {}
      }
    };

    /* No celular não há cursor nem evento confiável antes de fechar a aba.
       A única intenção observável é o botão/gesto Voltar. A entrada extra é
       criada sem temporizador e o pop-up só abre quando o popstate realmente
       acontece — rolagem, permanência e toque no conteúdo não abrem nada. */
    if (ponteiroGrosso) {
      try {
        history.pushState({ cdpOferta: true }, "", window.location.href);
        segurando = true;
      } catch {}
      window.addEventListener("popstate", aoVoltar);
    }
    document.addEventListener("pointermove", registrarMovimento, { passive: true });
    document.addEventListener("mouseout", saiuPorCima);

    return () => {
      window.removeEventListener("popstate", aoVoltar);
      document.removeEventListener("pointermove", registrarMovimento);
      document.removeEventListener("mouseout", saiuPorCima);
    };
  }, [abrir, chaveSessao]);

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
    if (onAplicar) {
      onAplicar();
      setAberto(false);
      return;
    }
    if (!slug) return;
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
          {descricao ?? "Use o cupom abaixo na finalização da compra do Lançamento Combo Plus 2027. Some com os 5% do Pix."}
        </p>
        <div className={styles.cupom}>
          <span className={styles.codigo}>{cupom}</span>
          <button className={styles.copiar} type="button" onClick={copiar}>
            {copiado ? "copiado!" : "copiar"}
          </button>
        </div>
        <button className={styles.usar} type="button" onClick={irParaOCheckout}>
          {onAplicar ? "Aplicar desconto agora" : "Usar meu desconto"}
        </button>
        <button className={styles.recusar} type="button" onClick={() => setAberto(false)}>
          Continuar navegando
        </button>
      </div>
    </div>
  );
}
