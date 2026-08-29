"use client";
import { useState } from "react";
import { DEPARTAMENTOS, WHATSAPP_LINK, WHATSAPP_NUMERO } from "./contato";
import s from "./pagina.module.css";

/* Formulário de contato.
   ATENÇÃO: o envio é SIMULADO — não há backend por trás. Enquanto não
   houver, a mensagem não chega a ninguém; por isso o WhatsApp aparece
   como canal alternativo na confirmação. */

const mascaraTelefone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");
};
const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

type Campos = { nome: string; email: string; telefone: string; departamento: string; assunto: string; mensagem: string };
const VAZIO: Campos = { nome: "", email: "", telefone: "", departamento: "", assunto: "", mensagem: "" };

export default function FormContato() {
  const [v, setV] = useState<Campos>(VAZIO);
  const [tocado, setTocado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const set = (k: keyof Campos) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setV((o) => ({ ...o, [k]: k === "telefone" ? mascaraTelefone(e.target.value) : e.target.value }));

  const erros: Partial<Record<keyof Campos, string>> = {};
  if (v.nome.trim().split(/\s+/).length < 2) erros.nome = "Informe nome e sobrenome.";
  if (!emailOk(v.email)) erros.email = "E-mail inválido.";
  if (v.telefone.replace(/\D/g, "").length < 10) erros.telefone = "Telefone com DDD.";
  if (!v.departamento) erros.departamento = "Escolha um departamento.";
  if (v.assunto.trim().length < 3) erros.assunto = "Descreva o assunto.";
  if (v.mensagem.trim().length < 15) erros.mensagem = "Conte um pouco mais (mín. 15 caracteres).";
  const valido = Object.keys(erros).length === 0;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setTocado(true);
    if (!valido) return;
    setEnviando(true);
    await new Promise((r) => setTimeout(r, 900)); // simula a ida ao servidor
    setEnviando(false);
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className={s.sucesso} role="status">
        <div className={s.sucessoCheck}>✓</div>
        <h2>Seu contato foi enviado!</h2>
        <p>
          Recebemos sua mensagem sobre <strong>{v.assunto}</strong>. Nosso time entrará em contato
          em breve pelo e-mail <strong>{v.email}</strong>.
        </p>
        <p style={{ marginTop: 14 }}>
          Se preferir falar agora, chame no WhatsApp <strong>{WHATSAPP_NUMERO}</strong>.
        </p>
        <a className={s.wpp} href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>
        <p style={{ marginTop: 20 }}>
          <button type="button" className={s.rotulo} style={{ textDecoration: "underline", cursor: "pointer" }}
            onClick={() => { setV(VAZIO); setTocado(false); setEnviado(false); }}>
            Enviar outra mensagem
          </button>
        </p>
      </div>
    );
  }

  const erro = (k: keyof Campos) => tocado && erros[k];

  return (
    <form className={s.form} onSubmit={enviar} noValidate>
      <div className={s.campo}>
        <label className={s.rotulo} htmlFor="ct-nome">Nome completo <em>*</em></label>
        <input id="ct-nome" className={`${s.input} ${erro("nome") ? s.inputErro : ""}`}
          value={v.nome} onChange={set("nome")} autoComplete="name" />
        {erro("nome") && <span className={s.erro}>{erros.nome}</span>}
      </div>

      <div className={s.campo}>
        <label className={s.rotulo} htmlFor="ct-email">E-mail <em>*</em></label>
        <input id="ct-email" type="email" className={`${s.input} ${erro("email") ? s.inputErro : ""}`}
          value={v.email} onChange={set("email")} autoComplete="email" />
        {erro("email") && <span className={s.erro}>{erros.email}</span>}
      </div>

      <div className={s.campo}>
        <label className={s.rotulo} htmlFor="ct-tel">Telefone <em>*</em></label>
        <input id="ct-tel" className={`${s.input} ${erro("telefone") ? s.inputErro : ""}`}
          value={v.telefone} onChange={set("telefone")} inputMode="tel" autoComplete="tel" placeholder="(47) 99999-9999" />
        {erro("telefone") && <span className={s.erro}>{erros.telefone}</span>}
      </div>

      <div className={s.campo}>
        <label className={s.rotulo} htmlFor="ct-dep">Departamento <em>*</em></label>
        <select id="ct-dep" className={`${s.select} ${erro("departamento") ? s.inputErro : ""}`}
          value={v.departamento} onChange={set("departamento")}>
          <option value="">Selecione…</option>
          {DEPARTAMENTOS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        {erro("departamento") && <span className={s.erro}>{erros.departamento}</span>}
      </div>

      <div className={`${s.campo} ${s.campoLargo}`}>
        <label className={s.rotulo} htmlFor="ct-assunto">Assunto <em>*</em></label>
        <input id="ct-assunto" className={`${s.input} ${erro("assunto") ? s.inputErro : ""}`}
          value={v.assunto} onChange={set("assunto")} />
        {erro("assunto") && <span className={s.erro}>{erros.assunto}</span>}
      </div>

      <div className={`${s.campo} ${s.campoLargo}`}>
        <label className={s.rotulo} htmlFor="ct-msg">Mensagem <em>*</em></label>
        <textarea id="ct-msg" className={`${s.area} ${erro("mensagem") ? s.inputErro : ""}`}
          value={v.mensagem} onChange={set("mensagem")} />
        {erro("mensagem") && <span className={s.erro}>{erros.mensagem}</span>}
      </div>

      <button type="submit" className={s.enviar} disabled={enviando}>
        {enviando ? "Enviando…" : "Enviar mensagem"}
      </button>
    </form>
  );
}
