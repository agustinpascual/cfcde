"use client";
import { useState } from "react";
import type { EstadoChave } from "@/lib/config-integracoes";
import i from "./integracoes.module.css";

/* Campo editável de credencial.
   O valor atual chega mascarado — digitar substitui, deixar em branco apaga.
   O segredo inteiro nunca é enviado ao navegador. */
export default function FormIntegracao({ estado, nota }: { estado: EstadoChave; nota: string }) {
  const [valor, setValor] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [editando, setEditando] = useState(!estado.preenchida);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true); setMsg(null);
    try {
      const r = await fetch("/api/painel/integracoes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chave: estado.chave, valor }),
      });
      const d = await r.json();
      if (!r.ok) { setMsg({ tipo: "erro", texto: d.erro ?? "Falha ao salvar." }); return; }
      setMsg({ tipo: "ok", texto: valor.trim() ? "Salvo." : "Removido." });
      setValor(""); setEditando(false);
      setTimeout(() => location.reload(), 900);
    } catch {
      setMsg({ tipo: "erro", texto: "Falha de conexão." });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form className={i.campo} onSubmit={salvar}>
      <div className={i.campoTopo}>
        <code className={i.campoChave}>{estado.chave}</code>
        {estado.origem !== "vazia" && (
          <span className={`${i.origem} ${estado.origem === "painel" ? i.origemPainel : i.origemAmbiente}`}>
            {estado.origem === "painel" ? "salvo aqui" : "do ambiente"}
          </span>
        )}
      </div>
      <p className={i.campoNota}>{nota}</p>

      {!editando ? (
        <div className={i.campoLinha}>
          <span className={i.campoMascara}>{estado.amostra}</span>
          <button type="button" className={i.btnSecundario} onClick={() => setEditando(true)}
            disabled={!estado.editavel}>Alterar</button>
        </div>
      ) : (
        <div className={i.campoLinha}>
          <input className={i.campoInput} value={valor} onChange={(e) => setValor(e.target.value)}
            placeholder={estado.preenchida ? "novo valor (em branco apaga)" : "colar aqui"}
            autoComplete="off" spellCheck={false} disabled={!estado.editavel} />
          <button type="submit" className={i.btnPrimario} disabled={salvando || !estado.editavel}>
            {salvando ? "…" : "Salvar"}
          </button>
          {estado.preenchida && (
            <button type="button" className={i.btnSecundario}
              onClick={() => { setEditando(false); setValor(""); setMsg(null); }}>Cancelar</button>
          )}
        </div>
      )}

      {msg && <p className={msg.tipo === "ok" ? i.msgOk : i.msgErro}>{msg.texto}</p>}
      {!estado.editavel && <p className={i.msgErro}>Defina CHAVE_MESTRA para poder editar por aqui.</p>}
    </form>
  );
}
