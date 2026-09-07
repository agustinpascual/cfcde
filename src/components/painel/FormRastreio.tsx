"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { urlRastreio } from "@/lib/rastreio";
import d from "./pedido.module.css";

/* Código de rastreio do envio. Sem timeout o botão ficaria preso para sempre
   se a requisição estagnasse — o mesmo problema que o formulário de
   integrações tinha. */
const LIMITE_MS = 15_000;

export default function FormRastreio({ pedidoId, atual }: { pedidoId: string; atual: string | null }) {
  const router = useRouter();
  const [codigo, setCodigo] = useState(atual ?? "");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const mudou = codigo.trim().toUpperCase() !== (atual ?? "").toUpperCase();

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true); setMsg(null);
    const corta = new AbortController();
    const relogio = setTimeout(() => corta.abort(), LIMITE_MS);
    try {
      const r = await fetch(`/api/painel/pedidos/${pedidoId}/rastreio`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo }), signal: corta.signal,
      });
      const dados = await r.json();
      if (!r.ok) { setMsg({ tipo: "erro", texto: dados.erro ?? "Não foi possível salvar." }); return; }
      setMsg({ tipo: "ok", texto: dados.codigo ? "Rastreio salvo." : "Rastreio removido." });
      router.refresh();
    } catch (err) {
      setMsg((err as Error)?.name === "AbortError"
        ? { tipo: "erro", texto: "O servidor demorou demais. Tente de novo." }
        : { tipo: "erro", texto: "Falha de conexão." });
    } finally {
      clearTimeout(relogio);
      setSalvando(false);
    }
  }

  return (
    <form className={d.rastreio} onSubmit={salvar}>
      <label className={d.rastreioRotulo} htmlFor="rastreio">Código de rastreio</label>
      <div className={d.rastreioLinha}>
        <input id="rastreio" className={d.rastreioInput} value={codigo}
          onChange={(e) => { setCodigo(e.target.value); setMsg(null); }}
          placeholder="AA123456789BR" autoComplete="off" spellCheck={false}
          disabled={salvando} />
        <button type="submit" className={d.rastreioBotao} disabled={salvando || !mudou}>
          {salvando ? "Salvando…" : "Salvar"}
        </button>
      </div>
      {atual && (
        <p className={d.rastreioNota}>
          <a href={urlRastreio(atual)} target="_blank" rel="noopener noreferrer">
            Acompanhar o rastreio →
          </a>
        </p>
      )}
      {msg && <p className={msg.tipo === "ok" ? d.rastreioOk : d.rastreioErro}>{msg.texto}</p>}
    </form>
  );
}
