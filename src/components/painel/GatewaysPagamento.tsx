"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, ShieldCheck, Zap } from "lucide-react";
import type { ConfigGateways } from "@/lib/gateways-config";
import s from "./gateways.module.css";

export default function GatewaysPagamento({ inicial, editavel }: { inicial: ConfigGateways; editavel: boolean }) {
  const [config, setConfig] = useState(inicial);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [simulacao, setSimulacao] = useState("");
  const router = useRouter();
  async function salvar(event: React.FormEvent) {
    event.preventDefault(); setSalvando(true); setMensagem("");
    try {
      const r = await fetch("/api/painel/gateways", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(config), signal: AbortSignal.timeout(45000) });
      const dados = await r.json();
      if (!r.ok) throw new Error(dados.erro || "Não foi possível salvar.");
      setMensagem("Configuração salva. Novas cobranças usarão a seleção em até 30 segundos."); router.refresh();
    } catch (erro) { setMensagem((erro as Error).message); }
    finally { setSalvando(false); }
  }
  return <section className={s.bloco}>
    <header className={s.cabecalho}>
      <span className={s.icone} aria-hidden="true"><CreditCard size={22} strokeWidth={1.8} /></span>
      <div>
        <span className={s.sobretitulo}>Roteamento de cobranças</span>
        <h2>Gateways de pagamento</h2>
        <p>Defina por onde cada nova cobrança será processada.</p>
      </div>
      <span className={s.badge}><Zap size={13} fill="currentColor" /> Em uso</span>
    </header>
    <form onSubmit={salvar}>
      <div className={s.seletores}>
        <label>
          <span>Pagamento por PIX</span>
          <small>Gateway responsável por gerar o QR Code.</small>
          <select disabled={!editavel || salvando} value={config.pix} onChange={e => setConfig({ ...config, pix: e.target.value as ConfigGateways["pix"] })}>
            <option value="pinpay">PinPay</option><option value="axxonpay">AxxonPay</option>
          </select>
        </label>
        <label>
          <span>Cartão de crédito</span>
          <small>Processador usado no checkout da loja.</small>
          <select disabled={!editavel || salvando} value={config.cartao} onChange={e => setConfig({ ...config, cartao: e.target.value as ConfigGateways["cartao"] })}>
            <option value="desativado">Desativado</option><option value="sandbox">Sandbox local — apenas testes no painel</option><option value="axxonpay">AxxonPay (adquirente Bloopi)</option>
          </select>
        </label>
      </div>
      <div className={s.seguranca}>
        <ShieldCheck size={18} aria-hidden="true" />
        <p>A seleção vale apenas para novas cobranças. Os dados do cartão não são armazenados pela loja e pedidos existentes permanecem no gateway de origem.</p>
      </div>
      <button className={s.salvar} disabled={!editavel || salvando}>{salvando ? "Validando e salvando…" : "Validar e salvar configuração"}</button>
    </form>
    {mensagem && <p className={s.mensagem} role="status">{mensagem}</p>}
    {config.cartao === "sandbox" && <div className={s.sandbox}>
      <h3>Simulador local — não é uma cobrança</h3>
      <p>Não coleta cartão, não chama o gateway e não registra vendas. No checkout público, cartão fica indisponível. Isto não substitui a homologação com a AxxonPay.</p>
      <button type="button" onClick={() => setSimulacao("TESTE: pagamento fictício aprovado.")}>Simular aprovação</button>{" "}
      <button type="button" onClick={() => setSimulacao("TESTE: pagamento fictício recusado.")}>Simular recusa</button>
      <p role="status">{simulacao}</p>
    </div>}
  </section>;
}
