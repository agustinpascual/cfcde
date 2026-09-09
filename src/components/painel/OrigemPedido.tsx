"use client";

import { useState } from "react";
import { Ban, MapPin, Monitor, Wifi } from "lucide-react";
import s from "./origem.module.css";

/* Origem do pedido: dispositivo, IP e localização — mais um botão para
   bloquear o IP (o proxy passa a recusar o acesso ao site vindo dele).
   O rótulo do dispositivo chega pronto do servidor: este é um client
   component e não pode importar `dados` (server-only). */
export default function OrigemPedido({
  dispositivoLabel, ip, cidade, uf, pais, bloqueadoInicial,
}: {
  dispositivoLabel: string; ip: string | null;
  cidade: string | null; uf: string | null; pais: string | null;
  bloqueadoInicial: boolean;
}) {
  const [bloqueado, setBloqueado] = useState(bloqueadoInicial);
  const [ocupado, setOcupado] = useState(false);
  const local = [cidade, uf, pais && pais !== "BR" ? pais : null].filter(Boolean).join(" · ");

  async function alternar() {
    if (!ip || ocupado) return;
    setOcupado(true);
    try {
      const r = bloqueado
        ? await fetch(`/api/painel/ips?ip=${encodeURIComponent(ip)}`, { method: "DELETE" })
        : await fetch("/api/painel/ips", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ip, motivo: "Bloqueado pelo painel" }),
          });
      if (r.ok) setBloqueado(!bloqueado);
    } catch { /* mantém o estado atual */ }
    setOcupado(false);
  }

  return (
    <section className={`${s.bloco} ${bloqueado ? s.blocoBloqueado : ""}`}>
      <h2 className={s.titulo}>Origem do pedido</h2>
      <dl className={s.campos}>
        <div><dt><Monitor size={15} aria-hidden /> Dispositivo</dt><dd>{dispositivoLabel}</dd></div>
        <div><dt><Wifi size={15} aria-hidden /> IP</dt><dd className={s.mono}>{ip ?? "—"}</dd></div>
        <div><dt><MapPin size={15} aria-hidden /> Localização</dt><dd>{local || "—"}</dd></div>
      </dl>

      {ip && (
        bloqueado ? (
          <div className={s.rodape}>
            <span className={s.avisoBloqueado}><Ban size={14} aria-hidden /> Este IP está bloqueado</span>
            <button type="button" className={s.desbloquear} onClick={alternar} disabled={ocupado}>
              {ocupado ? "…" : "Desbloquear"}
            </button>
          </div>
        ) : (
          <button type="button" className={s.bloquear} onClick={alternar} disabled={ocupado}>
            {ocupado ? <>…</> : <><Ban size={15} aria-hidden /> Bloquear este IP</>}
          </button>
        )
      )}
    </section>
  );
}
