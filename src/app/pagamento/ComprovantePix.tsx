"use client";

import { useEffect, useState, type FormEvent } from "react";
import { LIMITE_COMPROVANTE, TIPOS_COMPROVANTE } from "@/lib/pix-comprovante-validacao";
import s from "./comprovante.module.css";

export default function ComprovantePix({ id, token, copiadoEm }: { id: string; token?: string; copiadoEm: number | null }) {
  const [aberto, setAberto] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const endpoint = `/api/pix/${encodeURIComponent(id)}/comprovante`;

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    void fetch(endpoint, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: controller.signal })
      .then(async r => { if (r.ok) { const d = await r.json(); if (!controller.signal.aborted && d.enviado === true) setEnviado(true); } })
      .catch(() => {});
    return () => controller.abort();
  }, [endpoint, token]);

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enviando || enviado || !token) return;
    const dados = new FormData(event.currentTarget);
    const arquivo = dados.get("arquivo");
    if (!(arquivo instanceof File) || !arquivo.size || arquivo.size > LIMITE_COMPROVANTE || !TIPOS_COMPROVANTE.includes(arquivo.type)) {
      setErro("Selecione um JPG, PNG, WebP ou PDF de até 5 MB.");
      return;
    }
    if (copiadoEm) dados.set("copiado_em", new Date(copiadoEm).toISOString());
    setEnviando(true); setErro("");
    try {
      const r = await fetch(endpoint, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: dados, signal: AbortSignal.timeout(30000),
      });
      const resposta = await r.json();
      if (!r.ok || !resposta.enviado) throw new Error(resposta.erro || "Não foi possível enviar o comprovante.");
      setEnviado(true);
    } catch (e) {
      setErro(e instanceof Error && e.name !== "TimeoutError" ? e.message : "O envio demorou mais que o esperado. Tente novamente para conferir se foi recebido.");
    } finally { setEnviando(false); }
  }

  if (!token) return null;
  if (enviado) return <section className={s.aviso} role="status">
    <strong>Comprovante enviado — aguardando confirmação</strong>
    <p>Recebemos seu arquivo para conferência. Não pague novamente enquanto aguarda.</p>
  </section>;
  if (!aberto && !copiadoEm) return <button type="button" className={s.abrir} onClick={() => setAberto(true)}>Já paguei — enviar comprovante</button>;
  return <section className={s.bloco} aria-labelledby="comprovante-titulo">
    <h2 id="comprovante-titulo">Já realizou o Pix?</h2>
    <form onSubmit={enviar}>
      <fieldset disabled={enviando}>
        <label>Imagem ou PDF (até 5 MB)<input name="arquivo" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required /></label>
        <button type="submit">{enviando ? "Enviando comprovante…" : "Enviar comprovante"}</button>
      </fieldset>
      {erro && <p className={s.erro} role="alert">{erro}</p>}
    </form>
  </section>;
}
