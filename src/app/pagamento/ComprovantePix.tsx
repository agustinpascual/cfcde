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
    const horario = new Date(String(dados.get("horario") ?? ""));
    const valor = Number(String(dados.get("valor") ?? "").replace(",", "."));
    if (!Number.isFinite(horario.getTime()) || !Number.isFinite(valor) || valor <= 0) {
      setErro("Confira o valor e o horário do pagamento."); return;
    }
    dados.set("horario", horario.toISOString());
    dados.set("valor_centavos", String(Math.round(valor * 100)));
    dados.delete("valor");
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
    <p>Recebemos seu arquivo para conferência. Isso ainda não confirma o pagamento. Não pague novamente enquanto aguarda; se precisar, fale com o atendimento.</p>
  </section>;
  if (!aberto && !copiadoEm) return <button type="button" className={s.abrir} onClick={() => setAberto(true)}>Já paguei pelo QR Code ou preciso enviar um comprovante</button>;
  return <section className={s.bloco} aria-labelledby="comprovante-titulo">
    <h2 id="comprovante-titulo">Já realizou o Pix?</h2>
    <p>Se a confirmação ainda não apareceu, envie o comprovante para conferência. O envio é opcional e não aprova o pedido automaticamente.</p>
    <form onSubmit={enviar}>
      <fieldset disabled={enviando}>
        <label>Comprovante (imagem ou PDF, até 5 MB)<input name="arquivo" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required /></label>
        <label>Nome do pagador que aparece no comprovante<input name="nome" type="text" minLength={3} maxLength={200} autoComplete="off" required /></label>
        <div className={s.campos}>
          <label>Valor pago (R$)<input name="valor" type="number" min="0.01" max="21474836.47" step="0.01" inputMode="decimal" placeholder="0,00" required /></label>
          <label>Data e hora no comprovante<input name="horario" type="datetime-local" required /></label>
        </div>
        <p className={s.nota}>Informe os dados como aparecem no arquivo. O horário usa o fuso do seu dispositivo. Envie apenas o comprovante deste pedido, sem extratos ou senhas. Ele ficará disponível somente para nossa equipe.</p>
        <button type="submit">{enviando ? "Enviando comprovante…" : "Enviar comprovante para conferência"}</button>
      </fieldset>
      {erro && <p className={s.erro} role="alert">{erro}</p>}
    </form>
  </section>;
}
