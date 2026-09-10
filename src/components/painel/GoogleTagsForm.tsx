"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import i from "./integracoes.module.css";

const LIMITE_MS = 15_000;

export default function GoogleTagsForm({ inicial, editavel }: { inicial: string[]; editavel: boolean }) {
  const router = useRouter();
  const [tags, setTags] = useState(inicial);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ ok: boolean; texto: string } | null>(null);

  const alterar = (indice: number, valor: string) => {
    setTags((atuais) => atuais.map((tag, iTag) => iTag === indice
      ? valor.trimStart().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 44)
      : tag));
    setMensagem(null);
  };

  async function salvar() {
    setSalvando(true); setMensagem(null);
    const controlador = new AbortController();
    const limite = window.setTimeout(() => controlador.abort(), LIMITE_MS);
    try {
      const resposta = await fetch("/api/painel/integracoes/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
        signal: controlador.signal,
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível salvar as tags.");
      setMensagem({ ok: true, texto: "Tags salvas e rastreamento atualizado." });
      router.refresh();
    } catch (erro) {
      setMensagem({ ok: false, texto: (erro as Error)?.name === "AbortError"
        ? "O servidor demorou demais. Tente novamente."
        : erro instanceof Error ? erro.message : "Falha de conexão." });
    } finally {
      window.clearTimeout(limite); setSalvando(false);
    }
  }

  return (
    <div className={i.pixelsForm}>
      <div className={i.pixelsCabecalho}>
        <div><b>Tags conectadas</b><span>{tags.length} {tags.length === 1 ? "tag" : "tags"}</span></div>
        <button type="button" className={i.btnSecundario} disabled={!editavel || tags.length >= 10}
          onClick={() => setTags((atuais) => [...atuais, ""])}>
          <Plus size={15} /> Adicionar tag
        </button>
      </div>

      {tags.length ? <div className={i.pixelsLista}>{tags.map((tag, indice) => (
        <div className={`${i.pixelLinha} ${i.googleLinha}`} key={`${tag}-${indice}`}>
          <span className={i.pixelNumero}>{indice + 1}</span>
          <label>ID da tag do Google
            <input value={tag} onChange={(evento) => alterar(indice, evento.target.value)}
              placeholder="G-, GT-, AW- ou GTM-" autoComplete="off" spellCheck={false}
              disabled={!editavel || salvando} />
          </label>
          <button type="button" className={i.pixelRemover} aria-label={`Remover tag ${tag || indice + 1}`}
            disabled={!editavel || salvando} onClick={() => setTags((atuais) => atuais.filter((_, iTag) => iTag !== indice))}>
            <Trash2 size={16} />
          </button>
        </div>
      ))}</div> : <p className={i.pixelsVazio}>Nenhuma tag cadastrada. Adicione a primeira tag do Google.</p>}

      <div className={i.pixelsRodape}>
        <p>É possível combinar Google Analytics, Google Ads e Google Tag Manager.</p>
        <button type="button" className={i.btnPrimario} onClick={() => void salvar()}
          disabled={!editavel || salvando || tags.some((tag) => !tag)}>
          {salvando ? "Salvando…" : "Salvar tags"}
        </button>
      </div>
      {mensagem && <p className={mensagem.ok ? i.msgOk : i.msgErro} role="status">{mensagem.texto}</p>}
      {!editavel && <p className={i.msgErro}>Defina CHAVE_MESTRA para editar as tags.</p>}
    </div>
  );
}
