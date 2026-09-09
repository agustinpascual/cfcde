"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { registrar } from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/Rastreador";
import { urlRastreio } from "@/lib/rastreio";
import { acompanharPix } from "@/lib/acompanhar-pix";
import s from "./pagamento.module.css";

/* A cobrança viaja pelo sessionStorage: ela já está na mão do navegador
   quando o checkout termina, e assim a página abre sem uma segunda ida ao
   servidor. Se a aba for fechada, o cliente volta pelo e-mail. */
export const CHAVE_PIX = "cdp:pix";

export type Cobranca = {
  id: string; pedido: string; total: number;
  qr_code: string; qr_code_url: string | null; expires_at?: string;
};

const LOGO = "/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/logo.png";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function PagamentoPix() {
  const [cobranca, setCobranca] = useState<Cobranca | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const [pago, setPago] = useState<{ rastreio: string | null; pedido: string | null } | null>(null);
  const abertoEm = useRef<number | null>(null);
  /* Marca a cópia do código e se o retorno à aba já foi registrado. Depois de
     copiar, o cliente vai ao app do banco; voltar para cá é o sinal de que
     seguiu com o pagamento. */
  const copiouEm = useRef<number | null>(null);
  const voltouRegistrado = useRef(false);

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

  /* sessionStorage não existe no servidor, então a leitura precisa acontecer
     depois da montagem — ler no inicializador do useState causaria erro de
     hidratação. É o caso legítimo de setState em efeito. */
  useEffect(() => {
    try {
      const bruto = sessionStorage.getItem(CHAVE_PIX);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (bruto) setCobranca(JSON.parse(bruto) as Cobranca);
    } catch { /* storage bloqueado — cai na tela de "não encontramos" */ }
    setCarregando(false);
  }, []);

  useEffect(() => {
    if (!cobranca) return;
    abertoEm.current = Date.now();
    registrar("pix_gerado", { pedido: cobranca.pedido, total: cobranca.total });

    const segundos = () => (abertoEm.current ? Math.round((Date.now() - abertoEm.current) / 1000) : 0);
    const aoSair = () => {
      const t = segundos();
      if (t > 0) registrar("saida", { pedido: cobranca.pedido, etapa: "pix", segundos_na_tela: t });
    };
    window.addEventListener("pagehide", aoSair);

    /* Voltou depois de copiar: a aba reaparece após a pessoa sair para o banco.
       Só conta uma vez e só se já houve cópia. */
    const aoVoltar = () => {
      if (document.visibilityState !== "visible") return;
      if (!copiouEm.current || voltouRegistrado.current) return;
      voltouRegistrado.current = true;
      registrar("voltou", {
        pedido: cobranca.pedido,
        segundos_fora: Math.round((Date.now() - copiouEm.current) / 1000),
      });
    };
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", aoVoltar);

    return () => {
      window.removeEventListener("pagehide", aoSair);
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", aoVoltar);
      aoSair();
    };
  }, [cobranca]);

  async function copiar() {
    if (!cobranca?.qr_code) return;
    try {
      await navigator.clipboard.writeText(cobranca.qr_code);
    } catch {
      return; // sem permissão de área de transferência: o cliente seleciona à mão
    }
    setCopiado(true);
    copiouEm.current = Date.now();
    window.setTimeout(() => setCopiado(false), 2200);
    registrar("pix_copiado", {
      pedido: cobranca.pedido,
      total: cobranca.total,
      segundos_na_tela: abertoEm.current ? Math.round((Date.now() - abertoEm.current) / 1000) : 0,
    });
  }

  if (carregando) return <div className={s.tela} />;

  if (!cobranca) {
    return (
      <div className={s.tela}>
        <Cabecalho />
        <div className={s.vazio}>
          <p className={s.vazioTitulo}>Não encontramos um PIX aberto</p>
          <p className={s.vazioTexto}>
            O código fica guardado só nesta aba. Se você a fechou ou recarregou de
            outro lugar, faça o pedido de novo — nada foi cobrado.
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
            <span className={s.sucessoIcone} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
            <h1 className={s.sucessoTitulo}>Obrigado pela sua compra!</h1>
            <p className={s.sucessoTexto}>
              Pagamento confirmado{pago.pedido ? <> · pedido <b>{pago.pedido}</b></> : null}.
            </p>
          </div>

          {pago.rastreio ? (
            <div className={s.cartao}>
              <p className={s.rastreioRotulo}>Código de rastreio</p>
              <p className={s.rastreioCodigo}>{pago.rastreio}</p>
              <a className={s.copiar} href={urlRastreio(pago.rastreio)} target="_blank" rel="noopener noreferrer">
                Rastrear meu pedido
              </a>
            </div>
          ) : (
            <p className={s.nota}>
              O código de rastreio será enviado por e-mail após a postagem.
            </p>
          )}

          <p className={s.rodape}>
            Você receberá por e-mail o comprovante da compra e as informações do pedido.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className={s.tela}>
      <Cabecalho />
      <main className={s.corpo}>
        <div className={s.resumo}>
          <p className={s.resumoRotulo}>Valor a pagar</p>
          <p className={s.valor}>{money.format(cobranca.total / 100)}</p>
          <p className={s.pedido}>Pedido nº <b>{cobranca.pedido}</b></p>
        </div>

        <div className={s.cartao}>
          {cobranca.qr_code_url && (
            <>
              <Image className={s.qr} src={cobranca.qr_code_url} alt="QR Code para pagamento PIX"
                width={232} height={232} unoptimized priority />
              <p className={s.qrLegenda}>Aponte a câmera do app do seu banco</p>
            </>
          )}

          <p className={s.ou}>ou copie o código</p>

          <label>
            <span className="sr-only" />
            <textarea className={s.codigo} readOnly value={cobranca.qr_code}
              aria-label="Código PIX copia e cola" onFocus={(e) => e.currentTarget.select()} />
          </label>
          <button type="button" className={`${s.copiar} ${copiado ? s.copiado : ""}`} onClick={copiar}>
            {copiado ? "Código copiado" : "Copiar código PIX"}
          </button>
        </div>

        <section className={s.passos}>
          <h2 className={s.passosTitulo}>Como pagar</h2>
          <ol className={s.lista}>
            <li className={s.passo}>
              <span className={s.passoNum}>1</span>
              <span className={s.passoTexto}>Copie o código acima.</span>
            </li>
            <li className={s.passo}>
              <span className={s.passoNum}>2</span>
              <span className={s.passoTexto}>
                No app do seu banco, escolha <b>PIX</b> e depois <b>Copia e Cola</b>.
              </span>
            </li>
            <li className={s.passo}>
              <span className={s.passoNum}>3</span>
              <span className={s.passoTexto}>Confira o valor e confirme.</span>
            </li>
          </ol>
          <p className={s.passosNota}>
            A confirmação leva poucos segundos e aparece aqui mesmo, sozinha.
          </p>
        </section>

        <p className={s.nota}>
          Não feche esta página antes de pagar. O código vale por tempo limitado —
          se expirar, é só refazer o pedido.
        </p>

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
