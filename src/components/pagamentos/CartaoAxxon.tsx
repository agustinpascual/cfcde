"use client";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { acompanharPix } from "@/lib/acompanhar-pix";
import { calcularParcelamentoCartao, luhn } from "@/lib/cartao";
import { concluirTentativa, liberarTentativaEncerrada, tentativaPagamento } from "@/lib/tentativa-pagamento";
import { dadosProdutoPixel, pixel } from "@/components/marketing/MetaPixel";
import { registrar } from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/Rastreador";
import { salvarPagamentoParaTela } from "@/lib/pagamento-navegacao";
import s from "./cartao.module.css";
import a from "./cartao-animacoes.module.css";

/* Cartão AxxonPay com adquirente Bloopi (decisão do lojista em docs/axxonpay.md).
   Os campos são não controlados: número, validade e CVV nunca entram no state
   do React, ficam só no DOM até o envio e são apagados logo depois. O SDK é
   carregado apenas quando esta opção é escolhida. A aprovação vem somente da
   consulta ao servidor; o resultado do 3DS no navegador é só orientação. */

type ResultadoSDK = { status?: "succeeded" | "processing" | "failed" | "requires_action" };
type SDK = { setPublicKey(chave: string): Promise<void>; handleNextAction(acao: unknown, dados: unknown): Promise<ResultadoSDK> };
declare global { interface Window { Axxon?: SDK } }

export type PayloadCartao = {
  produto: string; nome: string; email: string; documento: string; celular: string;
  endereco: { logradouro: string; numero: string; bairro: string; localidade: string; uf: string; cep: string };
} & Record<string, unknown>;

const SDK_URL = "https://app.axxonpay.com.br/v1/js/sdk.js";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const digitos = (valor: unknown) => String(valor ?? "").replace(/\D/g, "");
const FINAIS = ["approved", "failed", "expired", "refunded"];
const esperar = (ms: number) => new Promise<void>(resolve => window.setTimeout(resolve, ms));
const classificarErroSdk = (erro: unknown) => {
  const texto = erro instanceof Error ? erro.message : String(erro ?? "");
  if (/chave pública|autenticação/i.test(texto)) return "chave_publica";
  if (/Bloopi/i.test(texto)) return "provedor_bloopi";
  if (/carregar|load|network|fetch/i.test(texto)) return "rede_script";
  return "inicializacao";
};

const mascararNumero = (e: React.FormEvent<HTMLInputElement>) => { e.currentTarget.value = digitos(e.currentTarget.value).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 "); };
const mascararValidade = (e: React.FormEvent<HTMLInputElement>) => { const d = digitos(e.currentTarget.value).slice(0, 4); e.currentTarget.value = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; };
const somenteDigitos = (e: React.FormEvent<HTMLInputElement>) => { e.currentTarget.value = digitos(e.currentTarget.value).slice(0, 4); };

export default function CartaoAxxon({ publicKey, parcelasMax, total, payload, produtoNome, onEnviado, onDocumentoRecusado }: {
  publicKey: string; parcelasMax: number; total: number; payload: PayloadCartao; produtoNome: string;
  onEnviado?: () => void; onDocumentoRecusado?: (mensagem: string) => void;
}) {
  const [sdk, setSdk] = useState<"carregando" | "pronto" | "erro">("carregando");
  const [ocupado, setOcupado] = useState(false);
  const [parcelas, setParcelas] = useState(1);
  const [mensagem, setMensagem] = useState("");
  const [cobranca, setCobranca] = useState<{ id: string; pedido: string; total: number } | null>(null);
  const [status, setStatus] = useState("idle");
  const [fase3ds, setFase3ds] = useState<"idle" | "abrindo" | "desafio" | "conferindo" | "erro">("idle");
  const [autenticacaoFalhou, setAutenticacaoFalhou] = useState(false);
  const [podeRepetir, setPodeRepetir] = useState(false);
  const router = useRouter();
  const redirecionando = useRef(false);
  const inicializandoSdk = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const numero = useRef<HTMLInputElement>(null), titular = useRef<HTMLInputElement>(null);
  const validade = useRef<HTMLInputElement>(null), cvv = useRef<HTMLInputElement>(null);

  async function iniciar() {
    if (inicializandoSdk.current) return;
    inicializandoSdk.current = true;
    setSdk("carregando");
    setMensagem("");
    let ultimoErro: unknown;
    try {
      // O SDK principal ainda carrega o provedor interno (Bloopi) depois do
      // onReady. Em redes móveis essa segunda etapa pode falhar por alguns
      // segundos. Mantém a tela em carregamento e repete com backoff antes de
      // declarar o cartão indisponível.
      const esperas = [0, 500, 1000, 1500, 2500];
      for (let tentativa = 0; tentativa < esperas.length; tentativa++) {
        if (esperas[tentativa]) await esperar(esperas[tentativa]);
        try {
          if (!window.Axxon) throw new Error("SDK indisponível");
          await window.Axxon.setPublicKey(publicKey);
          setSdk("pronto");
          return;
        } catch (erro) {
          ultimoErro = erro;
        }
      }
      throw ultimoErro;
    } catch (erro) {
      const motivo = classificarErroSdk(erro);
      registrar("checkout_parcial", { etapa: "Pagamento", falha_cartao: "sdk_init", motivo });
      setSdk("erro");
      setMensagem("O ambiente seguro do cartão não terminou de carregar. Confira sua conexão e toque em “Tentar carregar novamente”.");
    } finally {
      inicializandoSdk.current = false;
    }
  }

  function tentarIniciarNovamente() {
    if (window.Axxon) void iniciar();
    else window.location.reload();
  }

  // Acompanha a cobrança até um estado final. Só a consulta ao servidor aprova.
  useEffect(() => {
    // O SDK/3DS já está trabalhando enquanto o iframe do banco está aberto.
    // Não disputa rede e CPU com ele fazendo GET a cada 2 s; a consulta começa
    // assim que o desafio termina ou falha.
    if (!cobranca || FINAIS.includes(status) || fase3ds === "abrindo" || fase3ds === "desafio") return;
    return acompanharPix(cobranca.id, dados => {
      const novo = dados.status === "paid" ? "approved" : dados.status ?? "";
      if (!FINAIS.includes(novo)) return;
      setStatus(novo);
      if (novo === "approved") {
        concluirTentativa(payload.produto, "cartao");
        registrar("compra", { pedido: cobranca.pedido, total: cobranca.total });
        if (!redirecionando.current) {
          redirecionando.current = true;
          try {
            salvarPagamentoParaTela({
              id: cobranca.id, pedido: dados.pedido ?? cobranca.pedido,
              total: cobranca.total, metodo: "cartao", confirmado: true,
              codigo_rastreio: dados.codigo_rastreio ?? null,
            });
            router.replace("/pagamento");
          } catch {
            // Storage bloqueado: não navega para uma tela sem contexto; a
            // confirmação aprovada continua visível no próprio checkout.
            redirecionando.current = false;
          }
        }
      }
    });
  }, [cobranca, status, fase3ds, payload.produto, router]);

  // Depois de uma autenticação incompleta, dá tempo para a consulta revelar
  // uma aprovação tardia antes de oferecer nova tentativa (evita cobrar duas vezes).
  useEffect(() => {
    if (!autenticacaoFalhou || status !== "processing") return;
    const espera = window.setTimeout(() => setPodeRepetir(true), 15000);
    return () => window.clearTimeout(espera);
  }, [autenticacaoFalhou, status]);

  async function pagar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (ocupado || sdk !== "pronto" || !window.Axxon || cobranca) return;
    const num = digitos(numero.current?.value);
    const nome = (titular.current?.value ?? "").trim().replace(/\s+/g, " ");
    const [mm, aa] = (validade.current?.value ?? "").split("/");
    const mes = Number(mm), ano = aa?.length === 2 ? 2000 + Number(aa) : Number(aa);
    const codigo = digitos(cvv.current?.value);
    const hoje = new Date();
    if (num.length < 13 || num.length > 19 || !luhn(num)) return setMensagem("Confira o número do cartão.");
    if (nome.length < 2) return setMensagem("Informe o nome impresso no cartão.");
    if (!(mes >= 1 && mes <= 12) || !ano || ano < hoje.getFullYear() || (ano === hoje.getFullYear() && mes < hoje.getMonth() + 1)) return setMensagem("Confira a validade do cartão.");
    if (codigo.length < 3 || codigo.length > 4) return setMensagem("Confira o código de segurança.");
    setOcupado(true); setMensagem(""); setAutenticacaoFalhou(false); setPodeRepetir(false);
    let tentativa = tentativaPagamento(payload.produto, "cartao");
    let criada = false;
    try {
      const enviar = async (id: string) => {
        const resposta = await fetch("/api/pagamentos/cartao", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...payload, cartao: { numero: num, titular: nome, mes, ano, cvv: codigo }, installments: parcelas, tentativa: id }),
          signal: AbortSignal.timeout(35000),
        });
        return { resposta, dados: await resposta.json() };
      };
      let { resposta: r, dados } = await enviar(tentativa);
      // Uma única renovação automática: somente quando o próprio servidor
      // consultou o intent antigo e confirmou que ele ficou sem nextAction,
      // portanto não pode abrir o 3DS nem capturar. Recusas e timeouts nunca
      // entram aqui e continuam exigindo ação explícita do comprador.
      if (!r.ok && dados.renovar === true && liberarTentativaEncerrada(payload.produto, "cartao", tentativa, dados)) {
        tentativa = tentativaPagamento(payload.produto, "cartao");
        ({ resposta: r, dados } = await enviar(tentativa));
      }
      if (!r.ok) {
        liberarTentativaEncerrada(payload.produto, "cartao", tentativa, dados);
        const mensagemErro = dados.erro || "Não foi possível processar o cartão.";
        if (typeof mensagemErro === "string" && /CPF|CNPJ|documento/i.test(mensagemErro)) {
          onDocumentoRecusado?.(mensagemErro);
          return;
        }
        throw new Error(mensagemErro);
      }
      criada = true;
      const statusInicial = dados.status === "paid" ? "approved" : dados.status;
      setCobranca({ id: dados.id, pedido: dados.pedido, total: dados.total });
      setStatus(FINAIS.includes(statusInicial) ? statusInicial : "processing");
      setMensagem("");
      onEnviado?.();
      pixel("AddPaymentInfo", { ...dadosProdutoPixel(payload.produto, produtoNome, dados.total), payment_method: "credit_card" });
      if (dados.nextAction) {
        // A Bloopi confirma no navegador (3DS) com o mesmo cartão; o objeto
        // nextAction é opaco e segue sem alterações, como pede o SDK.
        setFase3ds("abrindo");
        await new Promise<void>(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve())));
        setFase3ds("desafio");
        const e = payload.endereco;
        const resultado = await window.Axxon.handleNextAction(dados.nextAction, {
          amount: dados.total, installments: parcelas,
          card: { number: num, expMonth: String(mes).padStart(2, "0"), expYear: String(ano), cvv: codigo, holderName: nome },
          customer: { name: payload.nome, email: payload.email, phone: digitos(payload.celular), document: digitos(payload.documento),
            address: { street: e.logradouro, number: e.numero, neighborhood: e.bairro, city: e.localidade, state: e.uf, zip: digitos(e.cep) } },
        });
        setFase3ds("conferindo");
        if (resultado?.status === "failed") {
          setAutenticacaoFalhou(true);
          setMensagem("A autenticação não foi aprovada pelo banco. Estamos conferindo o estado final antes de liberar outra tentativa.");
        }
      } else if (!FINAIS.includes(statusInicial)) {
        // Na Bloopi, um cartão pendente precisa trazer nextAction. Sem ele não
        // existe segredo para abrir o 3DS; a consulta continua por 15 s para
        // capturar eventual conclusão antes de liberar outra tentativa.
        setFase3ds("erro");
        setAutenticacaoFalhou(true);
        setMensagem("A tela de autenticação do banco não pôde ser iniciada. Estamos conferindo o pagamento antes de liberar uma nova tentativa.");
      }
    } catch (erro) {
      if (criada) {
        setFase3ds("erro");
        setAutenticacaoFalhou(true);
        setMensagem("A autenticação com o seu banco não foi concluída. Estamos conferindo o status do pagamento.");
      } else {
        setMensagem(erro instanceof Error ? erro.message : "Não foi possível processar o cartão.");
      }
    } finally {
      form.current?.reset();   // o cartão sai do DOM assim que deixa de ser necessário
      setOcupado(false);
    }
  }

  function novaTentativa() {
    concluirTentativa(payload.produto, "cartao");
    setCobranca(null); setStatus("idle"); setFase3ds("idle"); setMensagem(""); setAutenticacaoFalhou(false); setPodeRepetir(false);
  }

  const opcoes = Array.from({ length: Math.max(1, parcelasMax) }, (_, i) => i + 1);
  const planoSelecionado = calcularParcelamentoCartao(total, parcelas);
  return <div className={s.bloco}>
    <Script src={SDK_URL} strategy="afterInteractive" onReady={() => void iniciar()}
      onError={() => { setSdk("erro"); setMensagem("O serviço de cartão está indisponível. Tente novamente em instantes ou pague com Pix."); }} />
    {!cobranca && <form ref={form} className={s.form} onSubmit={pagar} noValidate>
      <p className={s.aviso}><LockKeyhole aria-hidden="true" /><span>Os dados do cartão são transmitidos com criptografia e não ficam armazenados na loja.</span></p>
      <label>Número do cartão<input ref={numero} className={s.input} inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000" maxLength={23} onInput={mascararNumero} disabled={ocupado} required /></label>
      <label>Nome impresso no cartão<input ref={titular} className={s.input} autoComplete="cc-name" maxLength={60} disabled={ocupado} required /></label>
      <div className={s.linha}>
        <label>Validade (MM/AA)<input ref={validade} className={s.input} inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" maxLength={5} onInput={mascararValidade} disabled={ocupado} required /></label>
        <label>CVV<input ref={cvv} className={s.input} type="password" inputMode="numeric" autoComplete="cc-csc" maxLength={4} onInput={somenteDigitos} disabled={ocupado} required /></label>
      </div>
      <label>Parcelas<select className={s.input} value={parcelas} onChange={e => setParcelas(Number(e.target.value))} disabled={ocupado}>
        {opcoes.map(n => {
          const plano = calcularParcelamentoCartao(total, n);
          return <option key={n} value={n}>
            {n}x de {money.format(plano.total / n / 100)}{plano.acrescimo === 0 ? " sem juros" : ""}
          </option>;
        })}
      </select>
        {planoSelecionado.acrescimo > 0 && (
          <small className={s.resumoJuros}>
            Total parcelado: <b>{money.format(planoSelecionado.total / 100)}</b>
          </small>
        )}
      </label>
      <button className={s.botao} type="submit" disabled={sdk !== "pronto" || ocupado}>
        {sdk === "carregando" ? "Carregando pagamento seguro…" : sdk === "erro" ? "Cartão indisponível" : ocupado ? <span className={a.botaoCarregando}><LoaderCircle aria-hidden="true" /> Validando pagamento…</span> : `Pagar ${money.format(planoSelecionado.total / 100)}`}
      </button>
      {ocupado && <div className={a.validacao} role="status" aria-live="polite"><span className={a.escudo}><ShieldCheck aria-hidden="true" /></span><div><strong>Protegendo sua compra</strong><p>Validando os dados e preparando a autenticação do banco.</p><span className={a.progresso}><i /></span></div></div>}
      <p className={s.aviso}><ShieldCheck aria-hidden="true" /><span>Pagamento processado em ambiente seguro.</span></p>
    </form>}
    {cobranca && <div className={s.resultado} role="status" aria-live="polite">
      {status === "approved" ? <><h2>Pagamento aprovado</h2><p>Pedido <b>{cobranca.pedido}</b> · {money.format(cobranca.total / 100)}. Você receberá o comprovante e as informações do pedido por e-mail.</p></>
        : status === "failed" || status === "expired" ? <><h2>Pagamento não aprovado</h2><p>O emissor não autorizou esta tentativa. Nenhum valor foi cobrado.</p></>
        : status === "refunded" ? <><h2>Pagamento estornado</h2><p>Pedido <b>{cobranca.pedido}</b>.</p></>
        : <div className={`${s.tresDs} ${a.tresDs}`}>
            <span className={`${s.icone3ds} ${a.icone3ds}`} aria-hidden="true">{fase3ds === "conferindo" ? <ShieldCheck /> : <LoaderCircle className={fase3ds === "erro" ? "" : s.girando} />}</span>
            <div><h2>{fase3ds === "abrindo" || fase3ds === "desafio" ? "Autenticação de segurança" : "Confirmando o pagamento…"}</h2>
              <p>Pedido <b>{cobranca.pedido}</b>. {fase3ds === "abrindo" ? "Abrindo a tela segura do seu banco…" : fase3ds === "desafio" ? "Conclua a verificação na tela do banco. Não feche nem atualize esta página." : "Aguarde enquanto confirmamos o resultado do pagamento."}</p><span className={a.progresso}><i /></span></div>
          </div>}
    </div>}
    {mensagem && <p className={s.mensagem} role="alert">{mensagem}</p>}
    {!cobranca && sdk === "erro" && <button type="button" className={s.repetir} onClick={tentarIniciarNovamente}>Tentar carregar o cartão novamente</button>}
    {cobranca && (status === "failed" || status === "expired" || podeRepetir) && <button type="button" className={s.repetir} onClick={novaTentativa}>Tentar com outro cartão</button>}
  </div>;
}
