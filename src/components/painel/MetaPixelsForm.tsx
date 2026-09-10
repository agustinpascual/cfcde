"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PixelMetaPainel } from "@/lib/marketing-config";
import i from "./integracoes.module.css";

type Linha = PixelMetaPainel & { token: string };
const LIMITE_MS = 15_000;

export default function MetaPixelsForm({ inicial, editavel }: { inicial: PixelMetaPainel[]; editavel: boolean }) {
  const router = useRouter();
  const [linhas, setLinhas] = useState<Linha[]>(() => inicial.map((pixel) => ({ ...pixel, token: "" })));
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ ok: boolean; texto: string } | null>(null);

  const alterar = (indice: number, campo: "id" | "token", valor: string) => {
    setLinhas((atuais) => atuais.map((linha, iLinha) => iLinha === indice
      ? { ...linha, [campo]: campo === "id" ? valor.replace(/\D/g, "").slice(0, 25) : valor }
      : linha));
    setMensagem(null);
  };

  async function salvar() {
    setSalvando(true); setMensagem(null);
    const controlador = new AbortController();
    const limite = window.setTimeout(() => controlador.abort(), LIMITE_MS);
    try {
      const resposta = await fetch("/api/painel/integracoes/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pixels: linhas.map(({ id, token }) => ({ id, token })) }),
        signal: controlador.signal,
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível salvar os pixels.");
      setMensagem({ ok: true, texto: "Pixels salvos e rastreamento atualizado." });
      setLinhas((atuais) => atuais.map((linha) => ({
        ...linha, token: "", tokenPreenchido: true,
        tokenAmostra: linha.token ? `${linha.token.slice(0, 7)}••••••••••${linha.token.slice(-4)}` : linha.tokenAmostra,
      })));
      router.refresh();
    } catch (erro) {
      setMensagem({ ok: false, texto: (erro as Error)?.name === "AbortError"
        ? "O servidor demorou demais. Tente novamente."
        : erro instanceof Error ? erro.message : "Falha de conexão." });
    } finally {
      window.clearTimeout(limite);
      setSalvando(false);
    }
  }

  return (
    <div className={i.pixelsForm}>
      <div className={i.pixelsCabecalho}>
        <div><b>Pixels conectados</b><span>{linhas.length} {linhas.length === 1 ? "pixel" : "pixels"}</span></div>
        <button type="button" className={i.btnSecundario} disabled={!editavel || linhas.length >= 10}
          onClick={() => setLinhas((atuais) => [...atuais, { id: "", token: "", tokenPreenchido: false, tokenAmostra: "" }])}>
          <Plus size={15} /> Adicionar pixel
        </button>
      </div>

      {linhas.length ? <div className={i.pixelsLista}>{linhas.map((linha, indice) => (
        <div className={i.pixelLinha} key={`${linha.id}-${indice}`}>
          <span className={i.pixelNumero}>{indice + 1}</span>
          <label>ID do pixel
            <input value={linha.id} onChange={(evento) => alterar(indice, "id", evento.target.value)}
              inputMode="numeric" placeholder="Ex.: 123456789012345" disabled={!editavel || salvando} />
          </label>
          <label>Token da API de Conversões
            <input type="password" value={linha.token} onChange={(evento) => alterar(indice, "token", evento.target.value)}
              placeholder={linha.tokenPreenchido ? linha.tokenAmostra : "Cole o token EAA…"}
              autoComplete="off" spellCheck={false} disabled={!editavel || salvando} />
          </label>
          <button type="button" className={i.pixelRemover} aria-label={`Remover pixel ${linha.id || indice + 1}`}
            disabled={!editavel || salvando} onClick={() => setLinhas((atuais) => atuais.filter((_, iLinha) => iLinha !== indice))}>
            <Trash2 size={16} />
          </button>
        </div>
      ))}</div> : <p className={i.pixelsVazio}>Nenhum pixel cadastrado. Adicione o primeiro ID e token.</p>}

      <div className={i.pixelsRodape}>
        <p>O token fica cifrado e nunca é exibido novamente. Deixe o campo vazio para conservar o token atual.</p>
        <button type="button" className={i.btnPrimario} onClick={() => void salvar()}
          disabled={!editavel || salvando || linhas.some((linha) => !linha.id)}>
          {salvando ? "Salvando…" : "Salvar pixels"}
        </button>
      </div>
      {mensagem && <p className={mensagem.ok ? i.msgOk : i.msgErro} role="status">{mensagem.texto}</p>}
      {!editavel && <p className={i.msgErro}>Defina CHAVE_MESTRA para editar os pixels.</p>}
    </div>
  );
}
