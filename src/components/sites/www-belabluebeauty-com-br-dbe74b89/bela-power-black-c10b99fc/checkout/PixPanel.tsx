"use client";
import { useEffect, useRef, useState } from "react";
import s from "./checkout.module.css";

/* Tela do PIX gerado: QR Code, contagem de 15 minutos, copia-e-cola e
   passo a passo. O status é consultado em /api/pix/{id} — a chave sk_
   fica só no servidor. */

export type Cobranca = {
  id: string;
  pedido: string;
  total: number;
  qr_code: string;
  qr_code_url: string;
  expires_at: string;
};

const JANELA_PADRAO = 15 * 60; // 15 minutos

const moedaCentavos = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PASSOS = [
  "Abra o aplicativo do seu banco",
  "Escolha pagar com PIX › QR Code ou Copia e Cola",
  "Escaneie o código ao lado ou cole o código copiado",
  "Confira o valor e confirme — a aprovação é imediata",
];

export default function PixPanel({ cobranca, aoAprovar }: { cobranca: Cobranca; aoAprovar?: () => void }) {
  const [status, setStatus] = useState<"pending" | "approved" | "expired">("pending");
  const [copiado, setCopiado] = useState(false);
  const [restante, setRestante] = useState(JANELA_PADRAO);
  const aprovado = useRef(false);

  /* consulta o status até aprovar ou expirar */
  useEffect(() => {
    let vivo = true;
    const id = setInterval(async () => {
      try {
        const r = await fetch(`/api/pix/${cobranca.id}`, { cache: "no-store" });
        if (!r.ok || !vivo) return;
        const d = await r.json();
        if (d.status === "approved" && !aprovado.current) {
          aprovado.current = true;
          setStatus("approved");
          aoAprovar?.();
          clearInterval(id);
        } else if (d.status === "expired") {
          setStatus("expired");
          clearInterval(id);
        }
      } catch { /* rede instável — tenta no próximo ciclo */ }
    }, 4000);
    return () => { vivo = false; clearInterval(id); };
  }, [cobranca.id, aoAprovar]);

  /* contagem regressiva: usa o expires_at da PinPay, com 15 min de teto */
  useEffect(() => {
    const daApi = new Date(cobranca.expires_at).getTime();
    const alvo = Number.isNaN(daApi) ? Date.now() + JANELA_PADRAO * 1000
                                     : Math.min(daApi, Date.now() + JANELA_PADRAO * 1000);
    const tick = () => {
      const seg = Math.max(0, Math.floor((alvo - Date.now()) / 1000));
      setRestante(seg);
      if (seg === 0) setStatus((v) => (v === "pending" ? "expired" : v));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cobranca.expires_at]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(cobranca.qr_code);
    } catch {
      return; // clipboard bloqueado — o código continua selecionável
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  if (status === "approved") {
    return (
      <div className={`${s.pix} ${s.pixAprovado}`} role="status">
        <div className={s.pixCheck}>✓</div>
        <h3 className={s.pixTitulo}>Pagamento aprovado!</h3>
        <p className={s.pixTexto}>
          Recebemos seu PIX de <strong>{moedaCentavos(cobranca.total)}</strong>.
          O pedido <strong>{cobranca.pedido}</strong> já entrou em separação e você
          vai receber a confirmação por e-mail.
        </p>
      </div>
    );
  }

  const mm = String(Math.floor(restante / 60)).padStart(2, "0");
  const ss = String(restante % 60).padStart(2, "0");
  const acabando = restante <= 120;

  return (
    <div className={s.pix}>
      <div className={s.pixTopo}>
        <div>
          <h3 className={s.pixTitulo}>Pague com PIX para concluir</h3>
          <p className={s.pixTexto}>
            Pedido <strong>{cobranca.pedido}</strong> · <strong>{moedaCentavos(cobranca.total)}</strong>
          </p>
        </div>
        <div className={`${s.pixRelogio} ${acabando ? s.pixRelogioAlerta : ""}`}>
          <span className={s.pixRelogioLabel}>{status === "expired" ? "expirado" : "expira em"}</span>
          <span className={s.pixRelogioTempo} suppressHydrationWarning>{mm}:{ss}</span>
        </div>
      </div>

      {status === "expired" ? (
        <p className={s.erro}>
          O tempo para pagar este código acabou. Feche e gere um novo PIX para continuar.
        </p>
      ) : (
        <>
          <div className={s.pixConteudo}>
            <div className={s.pixQrBox}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={s.pixQr} src={cobranca.qr_code_url} alt="QR Code para pagamento PIX" width={210} height={210} />
              <span className={s.pixQrDica}>Aponte a câmera do app do banco</span>
            </div>

            <ol className={s.pixPassos}>
              {PASSOS.map((t, i) => (
                <li key={i}><span className={s.pixPassoNum}>{i + 1}</span>{t}</li>
              ))}
            </ol>
          </div>

          <p className={s.pixLabel}>Ou use o código copia e cola</p>
          <div className={s.pixCopia}>
            <code className={s.pixCodigo}>{cobranca.qr_code}</code>
            <button type="button" className={s.btnEscuro} onClick={copiar}>
              {copiado ? "Copiado ✓" : "Copiar código"}
            </button>
          </div>

          <p className={s.pixEspera} aria-live="polite">
            <span className={s.pixPulso} aria-hidden />
            Assim que o banco confirmar, esta tela muda sozinha. Pode deixar aberta.
          </p>
        </>
      )}
    </div>
  );
}
