"use client";

import { useState } from "react";
import { MessageCircle, Save, ShoppingCart, WalletCards } from "lucide-react";
import w from "./whatsapp.module.css";

type Props = { pix: string; carrinho: string };

const variaveisPix = ["{nome}", "{pedido}", "{valor}", "{codigo_pix}"];
const variaveisCarrinho = ["{nome}", "{produto}", "{valor}", "{link}"];

export default function MensagensRecuperacao({ pix: inicialPix, carrinho: inicialCarrinho }: Props) {
  const [pix, setPix] = useState(inicialPix);
  const [carrinho, setCarrinho] = useState(inicialCarrinho);
  const [salvando, setSalvando] = useState(false);
  const [retorno, setRetorno] = useState<{ ok: boolean; texto: string } | null>(null);

  async function salvar() {
    setSalvando(true); setRetorno(null);
    try {
      const resposta = await fetch("/api/painel/whatsapp/mensagens", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pix, carrinho }),
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível salvar as mensagens.");
      setRetorno({ ok: true, texto: "Mensagens de recuperação salvas." });
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
          Icone={WalletCards} valor={pix} setValor={setPix} variaveis={variaveisPix} />
        <Modelo titulo="Recuperação de carrinho abandonado" descricao="Usada junto do link que restaura produtos e dados do checkout."
          Icone={ShoppingCart} valor={carrinho} setValor={setCarrinho} variaveis={variaveisCarrinho} />
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

function Modelo({ titulo, descricao, Icone, valor, setValor, variaveis }: {
  titulo: string; descricao: string; Icone: typeof WalletCards; valor: string;
  setValor: (valor: string) => void; variaveis: string[];
}) {
  return (
    <article className={w.modeloCard}>
      <header><Icone aria-hidden="true" /><div><h3>{titulo}</h3><p>{descricao}</p></div></header>
      <label>
        Mensagem
        <textarea value={valor} onChange={(evento) => setValor(evento.target.value)} maxLength={1600} rows={8} />
      </label>
      <div className={w.variaveis}><span>Variáveis disponíveis:</span>{variaveis.map((item) => <code key={item}>{item}</code>)}</div>
      <small>{valor.length}/1600 caracteres</small>
    </article>
  );
}
