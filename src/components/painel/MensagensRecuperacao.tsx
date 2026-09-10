"use client";

import { useState } from "react";
import { MessageCircle, Save, ShoppingCart, WalletCards } from "lucide-react";
import w from "./whatsapp.module.css";

type Props = { pix: string; carrinho: string; atrasoPix: number; atrasoCarrinho: number; botaoPix: boolean };

const tempos = [
  [0, "Desativada"], [5, "Após 5 minutos"], [10, "Após 10 minutos"],
  [15, "Após 15 minutos"], [30, "Após 30 minutos"], [60, "Após 1 hora"],
  [120, "Após 2 horas"], [360, "Após 6 horas"], [1440, "Após 1 dia"],
] as const;

const variaveisPix = ["{nome}", "{pedido}", "{valor}", "{codigo_pix}"];
const variaveisCarrinho = ["{nome}", "{produto}", "{valor}", "{link}"];

export default function MensagensRecuperacao({ pix: inicialPix, carrinho: inicialCarrinho, atrasoPix: inicialAtrasoPix, atrasoCarrinho: inicialAtrasoCarrinho, botaoPix: inicialBotaoPix }: Props) {
  const [pix, setPix] = useState(inicialPix);
  const [carrinho, setCarrinho] = useState(inicialCarrinho);
  const [atrasoPix, setAtrasoPix] = useState(inicialAtrasoPix);
  const [atrasoCarrinho, setAtrasoCarrinho] = useState(inicialAtrasoCarrinho);
  const [botaoPix, setBotaoPix] = useState(inicialBotaoPix);
  const [salvando, setSalvando] = useState(false);
  const [retorno, setRetorno] = useState<{ ok: boolean; texto: string } | null>(null);

  async function salvar() {
    setSalvando(true); setRetorno(null);
    try {
      const resposta = await fetch("/api/painel/whatsapp/mensagens", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pix, carrinho, atrasoPix, atrasoCarrinho, botaoPix }),
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível salvar as mensagens.");
      setRetorno({ ok: true, texto: "Mensagens e tempos de recuperação salvos." });
    } catch (erro) {
      setRetorno({ ok: false, texto: erro instanceof Error ? erro.message : "Não foi possível salvar as mensagens." });
    } finally { setSalvando(false); }
  }

  return (
    <section className={w.recuperacao} aria-labelledby="mensagens-recuperacao-titulo">
      <div className={w.recuperacaoTitulo}>
        <span><MessageCircle aria-hidden="true" /></span>
        <div>
          <h2 id="mensagens-recuperacao-titulo">Mensagens de recuperação</h2>
          <p>Personalize os textos usados para retomar vendas pelo WhatsApp.</p>
        </div>
      </div>

      <div className={w.modelosGrade}>
        <Modelo titulo="Recuperação de Pix pendente" descricao="Usada no detalhe de pedidos Pix que ainda aguardam pagamento."
          Icone={WalletCards} valor={pix} setValor={setPix} variaveis={variaveisPix}
          atraso={atrasoPix} setAtraso={setAtrasoPix} botaoCopiar={botaoPix} setBotaoCopiar={setBotaoPix} />
        <Modelo titulo="Recuperação de carrinho abandonado" descricao="Usada junto do link que restaura produtos e dados do checkout."
          Icone={ShoppingCart} valor={carrinho} setValor={setCarrinho} variaveis={variaveisCarrinho}
          atraso={atrasoCarrinho} setAtraso={setAtrasoCarrinho} />
      </div>

      <div className={w.recuperacaoRodape}>
        {retorno && <p className={retorno.ok ? w.mensagemOk : w.mensagemErro} role="status">{retorno.texto}</p>}
        <button type="button" className={w.salvarMensagens} onClick={salvar} disabled={salvando}>
          <Save aria-hidden="true" /> {salvando ? "Salvando…" : "Salvar mensagens"}
        </button>
      </div>
    </section>
  );
}

function Modelo({ titulo, descricao, Icone, valor, setValor, variaveis, atraso, setAtraso, botaoCopiar, setBotaoCopiar }: {
  titulo: string; descricao: string; Icone: typeof WalletCards; valor: string;
  setValor: (valor: string) => void; variaveis: string[]; atraso: number; setAtraso: (valor: number) => void;
  botaoCopiar?: boolean; setBotaoCopiar?: (valor: boolean) => void;
}) {
  return (
    <article className={w.modeloCard}>
      <header><Icone aria-hidden="true" /><div><h3>{titulo}</h3><p>{descricao}</p></div></header>
      <label>
        Enviar automaticamente
        <select value={atraso} onChange={(evento) => setAtraso(Number(evento.target.value))}>
          {tempos.map(([minutos, rotulo]) => <option key={minutos} value={minutos}>{rotulo}</option>)}
        </select>
      </label>
      <p className={w.regraExclusiva}>
        {atraso ? `A mensagem será enviada se a situação continuar pendente após ${atraso} minuto${atraso === 1 ? "" : "s"}.` : "O envio automático está desativado."}
      </p>
      {setBotaoCopiar && (
        <label className={w.opcaoBotao}>
          <input type="checkbox" checked={botaoCopiar} onChange={(evento) => setBotaoCopiar(evento.target.checked)} />
          <span>
            <strong>Adicionar botão “Copiar código Pix”</strong>
            <small>Ao tocar, o código Pix deste pedido é copiado automaticamente.</small>
          </span>
        </label>
      )}
      <label>
        Mensagem
        <textarea value={valor} onChange={(evento) => setValor(evento.target.value)} maxLength={1600} rows={8} />
      </label>
      <div className={w.variaveis}><span>Variáveis disponíveis:</span>{variaveis.map((item) => <code key={item}>{item}</code>)}</div>
      <small>{valor.length}/1600 caracteres</small>
    </article>
  );
}
