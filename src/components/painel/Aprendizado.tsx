"use client";
import { useEffect, useState } from "react";
import a from "./aprendizado.module.css";

type Duvida = {
  id: string; pergunta: string; vezes: number;
  intencao: string | null; confianca: number | null; ultima_em: string;
};

/* Fila do que o robô não soube responder, das mais frequentes.
   Responder aqui vira exemplo de treinamento na hora. */
export default function Aprendizado() {
  const [duvidas, setDuvidas] = useState<Duvida[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const [resposta, setResposta] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let vivo = true;
    async function buscar() {
      try {
        const r = await fetch("/api/painel/aprendizado", { cache: "no-store" });
        if (!r.ok || !vivo) return;
        const d = await r.json();
        if (!vivo) return;
        setDuvidas(d.duvidas ?? []);
        setErro(d.erro ?? null);
      } catch { /* tenta na próxima ação */ }
    }
    void buscar();
    return () => { vivo = false; };
  }, [versao]);

  async function agir(corpo: Record<string, unknown>) {
    setSalvando(true);
    try {
      const r = await fetch("/api/painel/aprendizado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      if (!r.ok) { setErro((await r.json()).erro ?? "Falhou."); return; }
      setAbertaId(null);
      setResposta("");
      setVersao((v) => v + 1);
    } finally {
      setSalvando(false);
    }
  }

  if (erro) return <p className={a.erro}>{erro}</p>;

  if (duvidas.length === 0) {
    return (
      <p className={a.vazio}>
        Nenhuma pergunta pendente. Conforme os clientes escreverem, o que o robô
        não souber responder aparece aqui — das mais repetidas para as menos.
      </p>
    );
  }

  return (
    <ul className={a.lista}>
      {duvidas.map((d) => (
        <li key={d.id} className={a.item}>
          <div className={a.linha}>
            <span className={a.vezes} title={`${d.vezes} vez(es)`}>{d.vezes}×</span>
            <span className={a.pergunta}>{d.pergunta}</span>
            <span className={a.sinal}>
              {d.intencao
                ? `casou com ${d.intencao} (${((d.confianca ?? 0) * 100).toFixed(0)}%)`
                : "não reconheceu"}
            </span>
          </div>

          {abertaId === d.id ? (
            <div className={a.editor}>
              <textarea
                className={a.campo}
                value={resposta}
                onChange={(ev) => setResposta(ev.target.value)}
                placeholder="Escreva a resposta que o robô deve dar para essa pergunta"
                rows={3}
                autoFocus
              />
              <div className={a.acoes}>
                <button type="button" className={a.btnSec} onClick={() => setAbertaId(null)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className={a.btnPrim}
                  disabled={!resposta.trim() || salvando}
                  onClick={() => agir({ id: d.id, pergunta: d.pergunta, resposta })}
                >
                  {salvando ? "Salvando…" : "Ensinar ao robô"}
                </button>
              </div>
            </div>
          ) : (
            <div className={a.acoes}>
              <button type="button" className={a.btnPrim}
                onClick={() => { setAbertaId(d.id); setResposta(""); }}>
                Responder
              </button>
              <button type="button" className={a.btnSec} disabled={salvando}
                onClick={() => agir({ id: d.id, acao: "descartar" })}>
                Descartar
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
