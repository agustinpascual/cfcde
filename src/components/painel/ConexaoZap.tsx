"use client";
import { useEffect, useState } from "react";
import w from "./whatsapp.module.css";

type Estado = { configurada: boolean; conectado?: boolean; celular?: boolean; erro?: string | null; qr?: string | null };

/* O número cai sozinho e nada avisa — as mensagens só param de chegar.
   Esta faixa mostra o estado e o QR na hora, sem sair do painel. */
export default function ConexaoZap() {
  const [e, setE] = useState<Estado | null>(null);
  const [reiniciando, setReiniciando] = useState(false);

  useEffect(() => {
    let vivo = true;
    async function ver() {
      try {
        const r = await fetch("/api/painel/zapi", { cache: "no-store" });
        if (!r.ok || !vivo) return;
        setE(await r.json());
      } catch { /* tenta no próximo ciclo */ }
    }
    void ver();
    // QR da Z-API expira rápido; 15s mantém um código válido na tela
    const t = setInterval(ver, 15000);
    return () => { vivo = false; clearInterval(t); };
  }, []);

  if (!e || !e.configurada || e.conectado) return null;

  async function reiniciar() {
    setReiniciando(true);
    await fetch("/api/painel/zapi", { method: "POST" });
    setTimeout(() => setReiniciando(false), 4000);
  }

  return (
    <div className={w.desconectado}>
      <div className={w.desconectadoTexto}>
        <p className={w.desconectadoTitulo}>WhatsApp desconectado</p>
        <p>
          A instância caiu do WhatsApp, então nenhuma mensagem chega nem sai.
          {e.erro ? <> Motivo informado pela Z-API: <code>{e.erro}</code>.</> : null}
          {" "}Tente reiniciar a sessão; se não voltar, leia o QR ao lado no
          WhatsApp do número (Aparelhos conectados › Conectar aparelho).
        </p>
        <button type="button" className={w.btnReiniciar} onClick={reiniciar} disabled={reiniciando}>
          {reiniciando ? "Reiniciando…" : "Reiniciar sessão"}
        </button>
      </div>
      {e.qr && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img className={w.qr} src={e.qr} alt="QR Code para reconectar o WhatsApp" width={168} height={168} />
      )}
    </div>
  );
}
