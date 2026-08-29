"use client";
import { useEffect, useRef, useState } from "react";
import s from "./checkout.module.css";

/* Painel do PIX: mostra QR Code + copia-e-cola e fica consultando o status
   até a PinPay aprovar. Toda a conversa com a API passa pelas rotas do
   servidor (/api/pix) — a chave sk_ nunca chega ao browser. */

export type Cobranca = {
  id: string;
  pedido: string;
  total: number;
  qr_code: string;
  qr_code_url: string;
  expires_at: string;
};

const moedaCentavos = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function PixPanel({ cobranca, aoAprovar }: { cobranca: Cobranca; aoAprovar: () => void }) {
  const [status, setStatus] = useState<"pending" | "approved" | "expired">("pending");
  const [copiado, setCopiado] = useState(false);
  const [restante, setRestante] = useState<number | null>(null);
  const aprovado = useRef(false);

  /* polling do status */
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
          aoAprovar();
          clearInterval(id);
        } else if (d.status === "expired") {
          setStatus("expired");
          clearInterval(id);
        }
      } catch { /* rede instável — tenta de novo no próximo tick */ }
    }, 4000);
    return () => { vivo = false; clearInterval(id); };
  }, [cobranca.id, aoAprovar]);

  /* contagem até expirar */
  useEffect(() => {
    const alvo = new Date(cobranca.expires_at).getTime();
    if (Number.isNaN(alvo)) return;
    const tick = () => setRestante(Math.max(0, Math.floor((alvo - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cobranca.expires_at]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(cobranca.qr_code);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch { /* clipboard bloqueado — o código segue visível para seleção manual */ }
  }

  if (status === "approved") {
    return (
      <div className={`${s.pix} ${s.pixAprovado}`} role="status">
        <div className={s.pixCheck}>✓</div>
        <h3 className={s.pixTitulo}>Pagamento aprovado!</h3>
        <p className={s.pixTexto}>
          Recebemos o seu PIX de <strong>{moedaCentavos(cobranca.total)}</strong>.
          O pedido <strong>{cobranca.pedido}</strong> já entrou em separação.
        </p>
      </div>
    );
  }

  return (
    <div className={s.pix}>
      <h3 className={s.pixTitulo}>Escaneie para pagar</h3>
      <p className={s.pixTexto}>
        Pedido <strong>{cobranca.pedido}</strong> · <strong>{moedaCentavos(cobranca.total)}</strong>
      </p>

      {status === "expired" ? (
        <p className={s.erro}>Este código expirou. Volte e gere um novo PIX.</p>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={s.pixQr} src={cobranca.qr_code_url} alt="QR Code do PIX" width={220} height={220} />

          <p className={s.pixLabel}>ou copie o código</p>
          <div className={s.pixCopia}>
            <code className={s.pixCodigo}>{cobranca.qr_code}</code>
            <button type="button" className={s.btnEscuro} onClick={copiar}>
              {copiado ? "Copiado ✓" : "Copiar"}
            </button>
          </div>

          <p className={s.pixEspera} aria-live="polite">
            <span className={s.pixPulso} aria-hidden /> Aguardando confirmação do pagamento…
            {restante !== null && restante > 0 && (
              <span className={s.pixTempo}>
                expira em {String(Math.floor(restante / 60)).padStart(2, "0")}:{String(restante % 60).padStart(2, "0")}
              </span>
            )}
          </p>
        </>
      )}
    </div>
  );
}
