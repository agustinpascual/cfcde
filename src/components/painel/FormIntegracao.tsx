"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { EstadoChave } from "@/lib/config-integracoes";
import i from "./integracoes.module.css";

/* Teto para a requisição. Sem ele, uma requisição que estagna (extensão do
   navegador, rede caindo, proxy) deixa o botão preso em "…" para sempre,
   porque nem o catch nem o finally chegam a rodar. */
const LIMITE_MS = 15_000;

/* Campo editável de credencial.
   O valor atual chega mascarado — digitar substitui, deixar em branco apaga.
   O segredo inteiro nunca é enviado ao navegador. */
export default function FormIntegracao({ estado, nota }: { estado: EstadoChave; nota: string }) {
  const router = useRouter();
  const [valor, setValor] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [editando, setEditando] = useState(!estado.preenchida);

  /* `novo` vazio nunca chega aqui pelo botão Salvar — apagar é uma ação
     separada e explícita. Antes, um Salvar com o campo em branco apagava em
     silêncio, e como a chave também vinha do ambiente nada parecia mudar. */
  async function enviar(novo: string) {
    setSalvando(true); setMsg(null);

    const corta = new AbortController();
    const relogio = setTimeout(() => corta.abort(), LIMITE_MS);
    try {
      const r = await fetch("/api/painel/integracoes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chave: estado.chave, valor: novo }),
        signal: corta.signal,
      });
      const d = await r.json();
      if (!r.ok) { setMsg({ tipo: "erro", texto: d.erro ?? "Não foi possível salvar." }); return; }

      setMsg({
        tipo: "ok",
        texto: novo.trim()
          ? "Chave salva."
          : estado.origem === "ambiente"
            ? "Removida do painel. A chave do servidor volta a valer."
            : "Chave removida.",
      });
      setValor(""); setEditando(false);
      /* router.refresh() em vez de location.reload(): rebusca só os dados do
         servidor e mantém a página de pé. O reload levava ~3s, jogava fora o
         que estava digitado e devolvia o campo mascarado. */
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

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (valor.trim()) void enviar(valor);
  }

  function remover() {
    if (confirm(`Remover ${estado.chave} do painel?`)) void enviar("");
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
          {/* autoFocus: quem clicou em Alterar quer digitar agora. */}
          <input className={i.campoInput} value={valor} onChange={(e) => setValor(e.target.value)}
            placeholder={estado.preenchida ? "colar a nova chave" : "colar aqui"}
            autoComplete="off" spellCheck={false} disabled={!estado.editavel} autoFocus />
          <button type="submit" className={i.btnPrimario}
            disabled={salvando || !estado.editavel || !valor.trim()}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
          {estado.preenchida && (
            <button type="button" className={i.btnSecundario} disabled={salvando}
              onClick={() => { setEditando(false); setValor(""); setMsg(null); }}>Cancelar</button>
          )}
        </div>
      )}

      {/* Apagar é ação própria, com confirmação — nunca efeito de um campo
          vazio. E quando a chave vem do servidor, dizer o que apagar faz. */}
      {estado.preenchida && estado.editavel && (
        <p className={i.campoNota}>
          <button type="button" className={i.btnRemover} onClick={remover} disabled={salvando}>
            Remover do painel
          </button>
          {estado.origem === "ambiente" && " — esta chave vem do servidor; o painel só a substitui."}
        </p>
      )}

      {msg && <p className={msg.tipo === "ok" ? i.msgOk : i.msgErro}>{msg.texto}</p>}
      {!estado.editavel && <p className={i.msgErro}>Defina CHAVE_MESTRA para poder editar por aqui.</p>}
    </form>
  );
}
