"use client";
import { useState } from "react";
import { marca } from "@/components/storefront/brand";
import s from "./entrar.module.css";

export default function FormEntrar() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(""); setEnviando(true);
    try {
      const r = await fetch("/api/painel/entrar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), senha: senha.trim() }),
      });
      const d = await r.json();
      if (!r.ok) { setErro(d.erro ?? "Não foi possível entrar."); return; }
      /* Navegação dura de propósito: garante que o cookie recém-criado vá
         na requisição do servidor. Com router.push/replace a requisição RSC
         saía antes do cookie valer e caía de volta na tela de login. */
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/painel");
    } catch {
      setErro("Falha de conexão.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={s.tela}>
      <form className={s.caixa} onSubmit={entrar}>
        <p className={s.marca}>{marca.nome}</p>
        <h1 className={s.titulo}>Painel administrativo</h1>
        <p className={s.sub}>Acesso restrito.</p>

        <label className={s.rotulo} htmlFor="email">E-mail</label>
        <input id="email" className={`${s.input} ${erro ? s.inputErro : ""}`} type="email"
          value={email} onChange={(e) => { setEmail(e.target.value); setErro(""); }}
          autoComplete="username" autoFocus />

        <label className={`${s.rotulo} ${s.rotuloEspaco}`} htmlFor="senha">Senha</label>
        <input id="senha" className={`${s.input} ${erro ? s.inputErro : ""}`} type="password"
          value={senha} onChange={(e) => { setSenha(e.target.value); setErro(""); }}
          autoComplete="current-password" />
        {erro && <p className={s.erro} role="alert">{erro}</p>}

        <button type="submit" className={s.botao} disabled={enviando || !email.trim() || !senha.trim()}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
