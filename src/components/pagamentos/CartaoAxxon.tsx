"use client";
import Script from "next/script";
import { useEffect, useState } from "react";
import { acompanharPix } from "@/lib/acompanhar-pix";
import { tentativaPagamento, concluirTentativa } from "@/lib/tentativa-pagamento";
import s from "./cartao.module.css";

type DadosCartao = { number: string; holderName: string; expMonth: string; expYear: string; cvv: string };
type SDK = {
  setPublicKey: (key: string) => Promise<void>;
  encrypt: (card: DadosCartao) => Promise<string>;
  handleNextAction: (action: unknown, payment: unknown) => Promise<unknown>;
};
declare global { interface Window { Axxon?: SDK } }

export default function CartaoAxxon({ publicKey, payload, total }: {
  publicKey: string; payload: { produto: string; nome: string; email: string; documento: string; celular: string;
    endereco: { logradouro: string; numero: string; bairro: string; localidade: string; uf: string; cep: string } } & Record<string, unknown>;
  total: number;
}) {
  const [pronto, setPronto] = useState(false), [ocupado, setOcupado] = useState(false);
  const [numero, setNumero] = useState(""), [nome, setNome] = useState(""), [validade, setValidade] = useState(""), [cvv, setCvv] = useState("");
  const [parcelas, setParcelas] = useState(1), [mensagem, setMensagem] = useState("");
  const [id, setId] = useState<string | null>(null), [status, setStatus] = useState("idle");
  useEffect(() => {
    if (!id) return;
    return acompanharPix(id, dados => {
      if (["approved", "paid"].includes(dados.status ?? "")) {
        setStatus("approved"); setMensagem(`Pagamento confirmado. Pedido ${dados.pedido ?? ""}.`);
        try { concluirTentativa(payload.produto, "cartao"); } catch {}
      } else if (["failed", "expired", "refunded"].includes(dados.status ?? "")) {
        setStatus(dados.status!); setMensagem(dados.status === "refunded" ? "Pagamento estornado." : "O gateway não aprovou esta tentativa.");
      }
    });
  }, [id, payload.produto]);

  async function iniciar() {
    try {
      if (!window.Axxon) throw new Error("SDK indisponível");
      await window.Axxon.setPublicKey(publicKey); setPronto(true);
    } catch { setMensagem("Não foi possível iniciar o pagamento por cartão. Tente novamente mais tarde."); }
  }
  async function pagar(event: React.FormEvent) {
    event.preventDefault();
    if (ocupado || !pronto || !window.Axxon || id) return;
    setOcupado(true); setMensagem("");
    const [mes, ano] = validade.split("/");
    const card: DadosCartao = { number: numero.replace(/\D/g, ""), holderName: nome.trim(), expMonth: mes, expYear: `20${ano}`, cvv };
    try {
      const tentativa = tentativaPagamento(payload.produto, "cartao");
      const hash = await window.Axxon.encrypt(card);
      if (!hash) throw new Error("Tokenização indisponível");
      const r = await fetch("/api/pagamentos/cartao", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload, cardHash: hash, installments: parcelas, tentativa }), signal: AbortSignal.timeout(35000) });
      const dados = await r.json();
      if (!r.ok) throw new Error(dados.erro || "Não foi possível processar o cartão.");
      setId(dados.id); setStatus("processing"); setMensagem("Pagamento enviado. Aguardando confirmação do gateway…");
      if (dados.nextAction) {
        const e = payload.endereco;
        await window.Axxon.handleNextAction(dados.nextAction, {
          amount: dados.total, installments: parcelas, card,
          customer: { name: payload.nome, email: payload.email, phone: payload.celular.replace(/\D/g, ""), document: payload.documento.replace(/\D/g, ""),
            address: { street: e.logradouro, number: e.numero, neighborhood: e.bairro, city: e.localidade, state: e.uf, zip: e.cep } },
        });
      }
      // Resultado do SDK não aprova a venda: apenas consulta autenticada no backend.
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : "Falha ao processar o cartão. Confira o status antes de tentar novamente.");
    } finally {
      setNumero(""); setNome(""); setValidade(""); setCvv(""); setOcupado(false);
    }
  }
  return <div className={s.bloco}>
    <Script src="https://app.axxonpay.com.br/v1/js/sdk.js" onReady={() => void iniciar()} onError={() => setMensagem("SDK do gateway indisponível.")} />
    {!id && <form onSubmit={pagar} className={s.form}>
      <p>Pagamento processado pela AxxonPay. Esta loja não armazena número, validade ou CVV do cartão.</p>
      <label>Nome no cartão<input required value={nome} onChange={e => setNome(e.target.value)} autoComplete="cc-name" disabled={ocupado} /></label>
      <label>Número do cartão<input required value={numero} onChange={e => setNumero(e.target.value.replace(/\D/g, "").slice(0, 19))} inputMode="numeric" autoComplete="cc-number" minLength={13} maxLength={19} disabled={ocupado} /></label>
      <div className={s.linha}>
        <label>Validade (MM/AA)<input required value={validade} onChange={e => { const d = e.target.value.replace(/\D/g, "").slice(0, 4); setValidade(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d); }} pattern="(0[1-9]|1[0-2])/[0-9]{2}" inputMode="numeric" autoComplete="cc-exp" disabled={ocupado} /></label>
        <label>CVV<input required type="password" value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))} minLength={3} maxLength={4} inputMode="numeric" autoComplete="cc-csc" disabled={ocupado} /></label>
      </div>
      <label>Parcelas<select value={parcelas} onChange={e => setParcelas(Number(e.target.value))} disabled={ocupado}>
        {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}x de {(total / n / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} sem juros</option>)}
      </select></label>
      <button disabled={!pronto || ocupado}>{ocupado ? "Processando com segurança…" : "Pagar com cartão"}</button>
    </form>}
    <p role="status" aria-live="polite">{mensagem}</p>
    {id && ["failed", "expired"].includes(status) && <button type="button" onClick={() => {
      concluirTentativa(payload.produto, "cartao"); setId(null); setStatus("idle"); setMensagem("");
    }}>Iniciar nova tentativa</button>}
  </div>;
}
