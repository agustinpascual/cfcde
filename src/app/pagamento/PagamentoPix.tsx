"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { registrar } from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/Rastreador";
import { urlRastreio } from "@/lib/rastreio";
import { acompanharPix } from "@/lib/acompanhar-pix";
import { lerPagamentoDaTela, type PagamentoNavegacao } from "@/lib/pagamento-navegacao";
import { eventoGoogle } from "@/components/marketing/MetaPixel";
import s from "./pagamento.module.css";
import ComprovantePix from "./ComprovantePix";

/* A cobrança viaja pelo sessionStorage: ela já está na mão do navegador
   quando o checkout termina, e assim a página abre sem uma segunda ida ao
   servidor. Se a aba for fechada, o cliente volta pelo e-mail. */
export type Cobranca = PagamentoNavegacao;

const LOGO = "/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/logo.png";
const PRODUTO_IMAGEM_PADRAO = "/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/box2027-1.webp";
const WHATSAPP = "5547920057518";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function PagamentoPix() {
  const [cobranca, setCobranca] = useState<Cobranca | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const [codigoCopiadoEm, setCodigoCopiadoEm] = useState<number | null>(null);
  const [mostrarWhatsApp, setMostrarWhatsApp] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(600);
  const [pago, setPago] = useState<{ rastreio: string | null; pedido: string | null } | null>(null);
  const abertoEm = useRef<number | null>(null);
  /* Marca a cópia do código e se o retorno à aba já foi registrado. Depois de
     copiar, o cliente vai ao app do banco; voltar para cá é o sinal de que
     seguiu com o pagamento. */
  const copiouEm = useRef<number | null>(null);
  const saiuDepoisDeCopiar = useRef(false);
  const voltouRegistrado = useRef(false);
  const compraGoogle = useRef("");

  /* Atualiza também assim que o cliente retorna do aplicativo do banco. */
  useEffect(() => {
    if (!cobranca?.id || pago) return;
    return acompanharPix(cobranca.id, (d) => {
      if (d.status === "approved" || d.status === "paid") {
        setPago({ rastreio: d.codigo_rastreio ?? null, pedido: d.pedido ?? cobranca.pedido });
        registrar("compra", { pedido: cobranca.pedido, total: cobranca.total });
      }
    });
  }, [cobranca, pago]);

  /* A Meta recebe Purchase pelo webhook, mesmo com a aba fechada. A tag do
     Google disponível no navegador recebe a confirmação quando esta tela
     mostra o estado aprovado, uma única vez por pedido. */
  useEffect(() => {
    if (!cobranca || !pago) return;
    const pedido = pago.pedido ?? cobranca.pedido;
    if (!pedido || compraGoogle.current === pedido) return;
    compraGoogle.current = pedido;
    eventoGoogle("Purchase", {
      transaction_id: pedido,
      currency: "BRL",
      value: Number((cobranca.total / 100).toFixed(2)),
      content_ids: [cobranca.id],
      content_name: cobranca.produto_nome ?? "Pedido Café com Deus Pai",
      num_items: 1,
    });
  }, [cobranca, pago]);

  /* sessionStorage não existe no servidor, então a leitura precisa acontecer
     depois da montagem — ler no inicializador do useState causaria erro de
     hidratação. É o caso legítimo de setState em efeito. */
  useEffect(() => {
    try {
      const pagamento = lerPagamentoDaTela();
      /* A leitura depende do sessionStorage e só pode acontecer depois da
         montagem. Os dois estados derivam do mesmo snapshot persistido. */
      /* eslint-disable react-hooks/set-state-in-effect */
      if (pagamento) {
        setCobranca(pagamento);
        if (pagamento.confirmado) {
          setPago({ rastreio: pagamento.codigo_rastreio ?? null, pedido: pagamento.pedido });
        }
      }
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch { /* storage bloqueado — cai na tela de "não encontramos" */ }
    setCarregando(false);
  }, []);

  useEffect(() => {
    if (!cobranca || cobranca.metodo !== "pix") return;
    abertoEm.current = Date.now();
    registrar("pix_gerado", { pedido: cobranca.pedido, total: cobranca.total });

    const segundos = () => (abertoEm.current ? Math.round((Date.now() - abertoEm.current) / 1000) : 0);
    const aoSair = () => {
      if (copiouEm.current) saiuDepoisDeCopiar.current = true;
      const t = segundos();
      if (t > 0) registrar("saida", { pedido: cobranca.pedido, etapa: "pix", segundos_na_tela: t });
    };
    window.addEventListener("pagehide", aoSair);

    /* Voltou depois de copiar: a aba reaparece após a pessoa sair para o banco.
       Só conta uma vez e só se já houve cópia. */
    const aoVoltar = () => {
      if (document.visibilityState !== "visible") return;
      if (!copiouEm.current || !saiuDepoisDeCopiar.current || voltouRegistrado.current) return;
      voltouRegistrado.current = true;
      setMostrarWhatsApp(true);
      registrar("voltou", {
        pedido: cobranca.pedido,
        segundos_fora: Math.round((Date.now() - copiouEm.current) / 1000),
      });
    };
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === "hidden") {
        if (copiouEm.current) saiuDepoisDeCopiar.current = true;
        return;
      }
      aoVoltar();
    };
    document.addEventListener("visibilitychange", aoMudarVisibilidade);
    window.addEventListener("focus", aoVoltar);
    window.addEventListener("pageshow", aoVoltar);

    return () => {
      window.removeEventListener("pagehide", aoSair);
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
      window.removeEventListener("focus", aoVoltar);
      window.removeEventListener("pageshow", aoVoltar);
      aoSair();
    };
  }, [cobranca]);

  useEffect(() => {
    if (!cobranca || cobranca.metodo !== "pix" || pago) return;
    const criadoEm = Date.parse(cobranca.criado_em ?? "");
    const limiteDezMinutos = (Number.isFinite(criadoEm) ? criadoEm : Date.now()) + 10 * 60 * 1000;
    const expiraGateway = Date.parse(cobranca.expires_at ?? "");
    const limite = Number.isFinite(expiraGateway) ? Math.min(limiteDezMinutos, expiraGateway) : limiteDezMinutos;
    const atualizar = () => setSegundosRestantes(Math.max(0, Math.ceil((limite - Date.now()) / 1000)));
    const inicio = window.setTimeout(atualizar, 0);
    const intervalo = window.setInterval(atualizar, 1000);
    return () => { window.clearTimeout(inicio); window.clearInterval(intervalo); };
  }, [cobranca, pago]);

  async function copiar() {
    if (!cobranca?.qr_code) return;
    let sucesso = false;
    try {
      await navigator.clipboard.writeText(cobranca.qr_code);
      sucesso = true;
    } catch {
      const campo = document.getElementById("pix-codigo") as HTMLTextAreaElement | null;
      campo?.focus();
      campo?.select();
      try { sucesso = document.execCommand("copy"); } catch { /* seleção manual continua disponível */ }
    }
    if (!sucesso) return;
    registrarCopia();
  }

  function registrarCopia() {
    if (!cobranca) return;
    if (copiouEm.current && Date.now() - copiouEm.current < 500) return;
    setCopiado(true);
    copiouEm.current = Date.now();
    setCodigoCopiadoEm(copiouEm.current);
    window.setTimeout(() => setCopiado(false), 2200);
    registrar("pix_copiado", {
      pedido: cobranca.pedido,
      total: cobranca.total,
      segundos_na_tela: abertoEm.current ? Math.round((Date.now() - abertoEm.current) / 1000) : 0,
    });
  }

  const whatsappHref = cobranca
    ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Olá, preciso de ajuda com o pagamento PIX do pedido ${cobranca.pedido}.`)}`
    : `https://wa.me/${WHATSAPP}`;
  const tempoPix = `${String(Math.floor(segundosRestantes / 60)).padStart(2, "0")}:${String(segundosRestantes % 60).padStart(2, "0")}`;

  if (carregando) return (
    <div className={s.tela}>
      <Cabecalho />
      <main className={`${s.corpo} ${s.carregandoPagamento}`} role="status" aria-label="Carregando pagamento">
        <span className={s.carregandoLinha} />
        <span className={s.carregandoTitulo} />
        <span className={s.carregandoTexto} />
        <div className={s.carregandoCartao}><span /></div>
      </main>
    </div>
  );

  if (!cobranca) {
    return (
      <div className={s.tela}>
        <Cabecalho />
        <div className={s.vazio}>
          <p className={s.vazioTitulo}>Não encontramos um pagamento aberto</p>
          <p className={s.vazioTexto}>
            Os dados desta etapa ficam guardados só nesta aba. Se você a fechou ou
            abriu em outro dispositivo, confira também o e-mail do pedido.
          </p>
          <Link href="/checkout" className={s.vazioBotao}>Voltar ao checkout</Link>
        </div>
      </div>
    );
  }

  if (pago) {
    return (
      <div className={s.tela}>
        <Cabecalho />
        <main className={s.corpo}>
          <div className={s.sucesso} role="status">
            <div className={s.sucessoAnimacao} aria-hidden="true">
              <span className={s.brilho} /><span className={s.brilho} /><span className={s.brilho} />
              <span className={s.brilho} /><span className={s.brilho} /><span className={s.brilho} />
              <span className={s.sucessoIcone}>
                <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
            </div>
            <p className={s.sucessoSelo}>Pagamento aprovado</p>
            <h1 className={s.sucessoTitulo}>Obrigado pela sua compra!</h1>
            <p className={s.sucessoTexto}>Seu pedido foi confirmado e já está sendo preparado.</p>
          </div>

          {pago.pedido && (
            <section className={s.pedidoAprovado} aria-label="Número do pedido">
              <p className={s.pedidoAprovadoRotulo}>Número do pedido</p>
              <p className={s.pedidoAprovadoNumero}>#{pago.pedido}</p>
              <p className={s.pedidoAprovadoNota}>Guarde este número para acompanhar a sua compra.</p>
            </section>
          )}

          {pago.rastreio ? (
            <div className={s.cartao}>
              <p className={s.rastreioRotulo}>Código de rastreio</p>
              <p className={s.rastreioCodigo}>{pago.rastreio}</p>
              <a className={s.copiar} href={urlRastreio(pago.rastreio)} target="_blank" rel="noopener noreferrer">
                Rastrear meu pedido
              </a>
            </div>
          ) : null}

          <section className={s.avisoEmail} aria-labelledby="aviso-email-titulo">
            <span className={s.avisoEmailIcone} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
            </span>
            <div className={s.avisoEmailConteudo}>
              <h2 id="aviso-email-titulo">Fique de olho no seu e-mail</h2>
              <p>Enviaremos para o e-mail informado no pedido:</p>
              <ul>
                <li>Sua nota fiscal</li>
                <li>O código de rastreamento assim que o pedido for enviado</li>
              </ul>
            </div>
          </section>

          <p className={s.rodape}>Não encontrou a mensagem? Confira também a caixa de spam.</p>
        </main>
      </div>
    );
  }

  return (
    <div className={s.tela}>
      <Cabecalho />
      <main className={`${s.corpo} ${s.pixEntrada}`}>
        <div className={s.topoPagamento}>
          <div>
            <p className={s.etapa}><span aria-hidden="true" /> Aguardando pagamento</p>
            <h1>Pague com Pix</h1>
            <p>Use o QR Code ou copie o código no aplicativo do seu banco.</p>
          </div>
          <div className={`${s.timerPix} ${segundosRestantes === 0 ? s.timerEncerrado : ""}`} role="timer" aria-live="off" aria-label={`Tempo para pagar: ${tempoPix}`}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
            <span>{segundosRestantes === 0 ? "Tempo encerrado" : "Tempo para pagar"}</span><strong>{tempoPix}</strong>
          </div>
        </div>

        <div className={s.pagamentoGrid}>
          <section className={s.cartao} aria-label="Código para pagamento Pix">
            {cobranca.qr_code_url && (
              <div className={s.qrBloco}>
                <div className={s.qrMoldura}>
                  <Image className={s.qr} src={cobranca.qr_code_url} alt="QR Code para pagamento PIX"
                    width={232} height={232} unoptimized priority />
                </div>
                <div>
                  <strong>Escaneie o QR Code</strong>
                  <p>Aponte a câmera do aplicativo do seu banco.</p>
                </div>
              </div>
            )}

            <p className={s.ou}>ou use o Pix Copia e Cola</p>

            <label className={s.codigoLabel} htmlFor="pix-codigo">Código Pix</label>
            <textarea id="pix-codigo" className={s.codigo} readOnly value={cobranca.qr_code}
              aria-label="Código PIX copia e cola" onFocus={(e) => e.currentTarget.select()} onCopy={registrarCopia} />
            <button type="button" className={`${s.copiar} ${copiado ? s.copiado : ""}`} onClick={copiar}>
              <span className={s.copiarConteudo}>
                {copiado ? <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg> : <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>}
                {copiado ? "Código copiado — abra seu banco" : "Copiar código Pix"}
              </span>
            </button>
            <p className={s.confirmacaoAutomatica}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
              A confirmação acontece quando o pagamento é confirmado pela adquirente.
            </p>
            <ComprovantePix key={cobranca.id} id={cobranca.id} token={cobranca.comprovante_token} copiadoEm={codigoCopiadoEm} />
          </section>

          <aside className={s.colunaResumo}>
            <section className={s.resumoPedido} aria-label="Resumo do pedido">
              <p className={s.resumoRotulo}>Resumo do pedido</p>
              <div className={s.produtoResumo}>
                <span className={s.produtoImagem}>
                  <Image src={cobranca.produto_imagem ?? PRODUTO_IMAGEM_PADRAO} alt="" width={64} height={64} />
                </span>
                <span><strong>{cobranca.produto_nome ?? "Box Café com Deus Pai 2027"}</strong><small>Pedido nº {cobranca.pedido}</small></span>
              </div>
              <div className={s.totalLinha}><span>Total</span><strong>{money.format(cobranca.total / 100)}</strong></div>
            </section>

            <section className={s.passos}>
              <h2 className={s.passosTitulo}>Como pagar</h2>
              <ol className={s.lista}>
                <li className={s.passo}><span className={s.passoNum}>1</span><span className={s.passoTexto}>Copie o código ou escaneie o QR Code.</span></li>
                <li className={s.passo}><span className={s.passoNum}>2</span><span className={s.passoTexto}>No banco, escolha <b>Pix Copia e Cola</b>.</span></li>
                <li className={s.passo}><span className={s.passoNum}>3</span><span className={s.passoTexto}>Confira o valor e confirme.</span></li>
              </ol>
            </section>
          </aside>
        </div>

        <p className={s.nota}><strong>Não feche esta página.</strong> Assim que o banco confirmar, mostraremos a aprovação automaticamente.</p>

        {mostrarWhatsApp && (
          <aside className={s.ajudaWhatsApp} role="status" aria-label="Atendimento pelo WhatsApp">
            <div>
              <strong>Precisa de ajuda para concluir?</strong>
              <span>Fale com nosso atendimento pelo WhatsApp.</span>
            </div>
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.5L3 20.5l1.4-4.7A8.5 8.5 0 1 1 20.5 11.6Z" />
                <path d="M8.5 7.8c.3-.3.7-.2.9.2l1 2c.1.3.1.5-.1.8l-.7.8c.8 1.6 1.9 2.7 3.5 3.5l.8-.8c.2-.2.5-.2.8-.1l2 1c.4.2.5.6.2.9-.8 1-1.8 1.4-2.9 1.1-4.4-1.1-7.1-3.8-8.2-8.2-.3-1.1.1-2.2 1.1-3Z" />
              </svg>
              Falar no WhatsApp
            </a>
          </aside>
        )}

      </main>
    </div>
  );
}

function Cabecalho() {
  return (
    <header className={s.cabecalho}>
      <Link href="/">
        <Image className={s.logo} src={LOGO} alt="Café com Deus Pai" width={62} height={70} priority />
      </Link>
    </header>
  );
}
