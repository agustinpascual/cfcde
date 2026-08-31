"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import s from "./painel.module.css";

/* Confere na PinPay os pedidos pendentes e corrige o status. É a rede de
   segurança para "pago mas mostrando pendente" — não depende do webhook. */
export default function BotaoReconciliar() {
  const router = useRouter();
  const [rodando, setRodando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function conferir() {
    setRodando(true);
    setAviso(null);
    try {
      const r = await fetch("/api/pix/reconciliar", { method: "POST" });
      const d = await r.json();
      if (!r.ok) { setAviso(d.erro ?? "Falhou."); return; }
      setAviso(
        d.verificados === 0
          ? "Nenhum pedido pendente para conferir."
          : `${d.verificados} conferidos · ${d.atualizados} atualizados · ${d.aprovados} aprovados.`
      );
      if (d.atualizados) router.refresh();
    } catch {
      setAviso("Sem conexão.");
    } finally {
      setRodando(false);
    }
  }

  return (
    <div className={s.reconciliar}>
      <div>
        <p className={s.reconciliarTitulo}>Conferir pagamentos</p>
        <p className={s.reconciliarNota}>
          Pergunta o status direto à PinPay e corrige pedidos que ficaram pendentes por
          engano. Use se desconfiar que um pagamento não apareceu.
        </p>
        {aviso && <p className={s.reconciliarAviso}>{aviso}</p>}
      </div>
      <button type="button" className={s.reconciliarBtn} onClick={conferir} disabled={rodando}>
        {rodando ? "Conferindo…" : "Conferir agora"}
      </button>
    </div>
  );
}
