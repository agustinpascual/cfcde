"use client";
import { useState } from "react";
import type { Treinamento } from "@/lib/robo";
import t from "./treinamento.module.css";

const AJUDA = {
  tom: "Como o robô escreve. Ex.: “Simpática e direta, usa você, sem formalidade.”",
  sobre_produto: "Tudo que ele precisa saber: o que é, formato, quantas gomas, sabor, kits, preços, prazos, frete. Quanto mais concreto, menos ele inventa.",
  regras: "Como conduzir a conversa: o que perguntar de volta, quando mandar o link, como falar de preço.",
  nao_pode: "Limites explícitos. Ex.: “Nunca prometer perda de peso, nunca comparar com medicamento, nunca dar conselho médico.”",
  escalar_quando: "Situações em que ele para e chama alguém. Ex.: “Reclamação, pedido atrasado, pergunta sobre saúde.”",
};

export default function FormTreinamento({ inicial }: { inicial: Treinamento }) {
  const [v, setV] = useState(inicial);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const campo = (k: keyof Treinamento) => (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setV((o) => ({ ...o, [k]: e.target.value }));

  const mudaExemplo = (i: number, k: "pergunta" | "resposta", valor: string) =>
    setV((o) => ({ ...o, exemplos: o.exemplos.map((e, j) => (j === i ? { ...e, [k]: valor } : e)) }));

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true); setMsg(null);
    try {
      const r = await fetch("/api/painel/treinamento", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v),
      });
      const d = await r.json();
      setMsg(r.ok ? { tipo: "ok", texto: "Treinamento salvo." } : { tipo: "erro", texto: d.erro ?? "Falha ao salvar." });
    } catch {
      setMsg({ tipo: "erro", texto: "Falha de conexão." });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form className={t.form} onSubmit={salvar}>
      <label className={t.chave}>
        <input type="checkbox" checked={v.ativo} onChange={(e) => setV((o) => ({ ...o, ativo: e.target.checked }))} />
        <span>
          <strong>Robô ativo</strong>
          <em>Desligado, as mensagens só ficam registradas e ninguém recebe resposta automática.</em>
        </span>
      </label>

      {(["tom", "sobre_produto", "regras", "nao_pode", "escalar_quando"] as const).map((k) => (
        <div key={k} className={t.bloco}>
          <label className={t.rotulo} htmlFor={`tr-${k}`}>
            {{ tom: "Tom de voz", sobre_produto: "Sobre o produto", regras: "Como responder",
               nao_pode: "O que não pode fazer", escalar_quando: "Quando chamar um humano" }[k]}
          </label>
          <p className={t.ajuda}>{AJUDA[k]}</p>
          <textarea id={`tr-${k}`} className={t.area} value={v[k]} onChange={campo(k)}
            rows={k === "sobre_produto" ? 10 : k === "tom" ? 3 : 5} />
        </div>
      ))}

      <div className={t.bloco}>
        <label className={t.rotulo}>Exemplos de resposta</label>
        <p className={t.ajuda}>
          Pares de pergunta e resposta modelo. É o que mais aproxima o robô do jeito
          que o seu time responde — vale mais que descrever o tom.
        </p>
        <div className={t.exemplos}>
          {v.exemplos.map((ex, i) => (
            <div key={i} className={t.exemplo}>
              <textarea className={t.exArea} rows={2} placeholder="Cliente pergunta…"
                value={ex.pergunta} onChange={(e) => mudaExemplo(i, "pergunta", e.target.value)} />
              <textarea className={t.exArea} rows={3} placeholder="Você responde…"
                value={ex.resposta} onChange={(e) => mudaExemplo(i, "resposta", e.target.value)} />
              <button type="button" className={t.remover}
                onClick={() => setV((o) => ({ ...o, exemplos: o.exemplos.filter((_, j) => j !== i) }))}>
                Remover
              </button>
            </div>
          ))}
        </div>
        <button type="button" className={t.adicionar}
          onClick={() => setV((o) => ({ ...o, exemplos: [...o.exemplos, { pergunta: "", resposta: "" }] }))}>
          + Adicionar exemplo
        </button>
      </div>

      <div className={t.rodape}>
        <button type="submit" className={t.salvar} disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar treinamento"}
        </button>
        {msg && <span className={msg.tipo === "ok" ? t.msgOk : t.msgErro}>{msg.texto}</span>}
      </div>
    </form>
  );
}
