"use client";

import { useEffect, useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import QRCode from "qrcode";
import { numeroWhatsapp, preencherMensagemRecuperacao, primeiroNome } from "@/lib/mensagens-recuperacao";
import s from "./pixcobranca.module.css";

/* Mostra a cobrança PIX no detalhe do pedido: QR, copia-e-cola e botão de
   copiar — para o lojista reenviar o código a quem ainda não pagou. */
export default function PixCobranca({ copiaCola, qrUrl, telefone, nome, pedido, valor, modelo }: {
  copiaCola: string; qrUrl?: string | null; telefone?: string | null; nome?: string | null;
  pedido?: string; valor?: string; modelo?: string;
}) {
  const [copiado, setCopiado] = useState(false);
  const [qrGerado, setQrGerado] = useState<string | null>(null);
  const qr = qrUrl ?? qrGerado;
  const numero = numeroWhatsapp(telefone);
  const mensagem = modelo ? preencherMensagemRecuperacao(modelo, {
    nome: primeiroNome(nome), pedido, valor, codigo_pix: copiaCola,
  }) : "";
  const whatsapp = numero && mensagem ? `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}` : null;

  useEffect(() => {
    if (qrUrl) return;
    let ativo = true;
    void QRCode.toDataURL(copiaCola, { width: 260, margin: 2, errorCorrectionLevel: "M" })
      .then((url) => { if (ativo) setQrGerado(url); })
      .catch(() => { /* o copia-e-cola continua disponível */ });
    return () => { ativo = false; };
  }, [copiaCola, qrUrl]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(copiaCola);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch { /* sem permissão: o cliente seleciona o texto à mão */ }
  }

  return (
    <div className={s.bloco}>
      {qr ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={s.qr} src={qr} alt="QR Code do PIX" width={220} height={220} />
      ) : <div className={s.qrCarregando} aria-label="Gerando QR Code" />}
      <div className={s.lado}>
        <span className={s.rotulo}>PIX copia e cola</span>
        <textarea className={s.codigo} value={copiaCola} readOnly
          aria-label="Código PIX copia e cola" onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className={`${s.copiar} ${copiado ? s.copiado : ""}`} onClick={copiar}>
          {copiado ? <><Check size={15} /> Copiado</> : <><Copy size={15} /> Copiar código</>}
        </button>
        {whatsapp && <a className={s.whatsapp} href={whatsapp} target="_blank" rel="noreferrer">
          <MessageCircle size={16} aria-hidden="true" /> Enviar recuperação no WhatsApp
        </a>}
      </div>
    </div>
  );
}
