"use client";

import { Check, Copy, ExternalLink, MessageCircle } from "lucide-react";
import { useState } from "react";
import c from "./carrinho-abandonado.module.css";

function numeroWhatsapp(telefone: string | null) {
  const digitos = (telefone ?? "").replace(/\D/g, "");
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  return digitos;
}

export default function AcoesRecuperacaoCarrinho({
  link, telefone, nome,
}: { link: string | null; telefone: string | null; nome: string | null }) {
  const [copiado, setCopiado] = useState(false);
  if (!link) {
    return (
      <p className={c.linkErro} role="alert">
        Configure <code>RECUPERACAO_CARRINHO_SECRET</code> no ambiente para gerar links seguros.
      </p>
    );
  }

  const primeiroNome = nome?.trim().split(/\s+/)[0];
  const mensagem = `Olá${primeiroNome ? `, ${primeiroNome}` : ""}! Separei seu carrinho para você. Para continuar a compra com seus dados já preenchidos, acesse: ${link}`;
  const numero = numeroWhatsapp(telefone);
  const whatsapp = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link!);
    } catch {
      const campo = document.createElement("textarea");
      campo.value = link!;
      campo.style.position = "fixed";
      campo.style.opacity = "0";
      document.body.appendChild(campo);
      campo.select();
      document.execCommand("copy");
      campo.remove();
    }
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 1800);
  }

  return (
    <div className={c.acoes}>
      <label className={c.linkCampo}>
        Link pessoal de recuperação
        <input readOnly value={link} aria-label="Link pessoal de recuperação" />
      </label>
      <div className={c.botoes}>
        <button type="button" className={c.botaoSecundario} onClick={copiar}>
          {copiado ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copiado ? "Link copiado" : "Copiar link"}
        </button>
        <a className={c.botaoWhatsapp} href={whatsapp} target="_blank" rel="noreferrer">
          <MessageCircle aria-hidden="true" /> Enviar no WhatsApp
        </a>
        <a className={c.botaoAbrir} href={link} target="_blank" rel="noreferrer">
          <ExternalLink aria-hidden="true" /> Conferir checkout
        </a>
      </div>
      <p className={c.linkNota}>O link expira em 14 dias e não mostra nome, telefone, CPF ou endereço na URL.</p>
    </div>
  );
}
