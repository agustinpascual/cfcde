"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { lerCobranca, type Cobranca } from "../checkout/cobranca";
import { moeda, resumo, useCarrinho } from "../cart";
import { IMG, produto } from "../data";
import PurchaseNotifications from "../PurchaseNotifications";
import SiteFooter from "../SiteFooter";
import s from "./pagamento.module.css";

const JANELA = 15 * 60; // 15 minutos para pagar
const reais = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PASSOS = [
  "Abra o aplicativo do seu banco",
  "Escolha pagar com PIX › QR Code ou Copia e Cola",
  "Escaneie o código ou cole o que você copiou",
  "Confira o valor e confirme — a aprovação é imediata",
];

export default function PagamentoView({ id }: { id: string }) {
  const [cobranca, setCobranca] = useState<Cobranca | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [status, setStatus] = useState<"pending" | "approved" | "expired">("pending");
  const [copiado, setCopiado] = useState(false);
  const [restante, setRestante] = useState(JANELA);
  const aprovado = useRef(false);
  const carrinho = useCarrinho();
  const r = resumo(carrinho);

  /* abre com o que veio do checkout; senão, busca na API.
     Tudo dentro da função async — setState síncrono no corpo do efeito
     dispara re-render em cascata. */
  useEffect(() => {
    let vivo = true;
    const carregar = async () => {
      const local = lerCobranca(id);
      if (local) {
        if (vivo) { setCobranca(local); setCarregando(false); }
        return;
      }
      try {
        const res = await fetch(`/api/pix/${id}`, { cache: "no-store" });
        const d = res.ok ? await res.json() : null;
        if (!vivo) return;
        if (d) {
          setCobranca({ id: d.id, pedido: "", total: d.amount ?? 0, qr_code: "", qr_code_url: null, expires_at: "" });
        }
      } catch {
        /* sem rede — cai no estado "cobrança não encontrada" */
      } finally {
        if (vivo) setCarregando(false);
      }
    };
    void carregar();
    return () => { vivo = false; };
  }, [id]);

  /* polling do status */
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/pix/${id}`, { cache: "no-store" });
        if (!res.ok) return;
        const d = await res.json();
        if (d.status === "approved" && !aprovado.current) {
          aprovado.current = true; setStatus("approved"); clearInterval(t);
        } else if (d.status === "expired") { setStatus("expired"); clearInterval(t); }
      } catch { /* tenta de novo no próximo ciclo */ }
    }, 4000);
    return () => clearInterval(t);
  }, [id]);

  /* contagem de 15 minutos */
  useEffect(() => {
    const alvo = Date.now() + JANELA * 1000;
    const tick = () => {
      const seg = Math.max(0, Math.floor((alvo - Date.now()) / 1000));
      setRestante(seg);
      if (seg === 0) setStatus((v) => (v === "pending" ? "expired" : v));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  async function copiar() {
    if (!cobranca?.qr_code) return;
    try {
      await navigator.clipboard.writeText(cobranca.qr_code);
    } catch {
      const el = document.getElementById("pix-codigo") as HTMLInputElement | null;
      el?.select(); // fallback: deixa selecionado para Ctrl+C
      return;
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2600);
  }

  const mm = String(Math.floor(restante / 60)).padStart(2, "0");
  const ss = String(restante % 60).padStart(2, "0");
  const acabando = restante <= 120;

  return (
    <div className={s.pagina}>
      {/* cabeçalho */}
      <header className={s.topo}>
        <div className={`bb-container ${s.topoInner}`}>
          <Link href="/" className={s.logo}>
            <Image src={`${IMG}/00-comprar-bela-power-black-prazo-e.png`} alt="Bela Blue Beauty" width={75} height={44} priority sizes="75px" />
          </Link>
          <span className={s.selo}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 3 4.5 6v5.5c0 4.7 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.8 7.5-9.5V6L12 3Z" /><path d="m9 12 2.2 2.2L15.5 10" />
            </svg>
            Ambiente seguro
          </span>
        </div>
      </header>

      <main className={`bb-container ${s.main}`}>
        {carregando ? (
          <p className={s.carregando}>Carregando sua cobrança…</p>
        ) : !cobranca ? (
          <div className={s.aviso}>
            <h1 className={s.tituloErro}>Cobrança não encontrada</h1>
            <p>Esse link pode ter expirado. Volte à loja e refaça o pedido.</p>
            <Link href="/" className={s.btnVoltar}>Voltar para a loja</Link>
          </div>
        ) : status === "approved" ? (
          <div className={s.aprovado} role="status">
            <div className={s.check}>✓</div>
            <h1 className={s.tituloOk}>Pagamento aprovado!</h1>
            <p className={s.subOk}>
              Recebemos seu PIX de <strong>{reais(cobranca.total)}</strong>. O pedido
              {cobranca.pedido && <> <strong>{cobranca.pedido}</strong></>} já entrou em separação
              e a confirmação vai para o seu e-mail.
            </p>
            <Link href="/" className={s.btnVoltar}>Voltar para a loja</Link>
          </div>
        ) : (
          <div className={s.colunas}>
            {/* ---- pagamento ---- */}
            <section className={s.painel}>
              <div className={s.painelTopo}>
                <div>
                  <h1 className={s.titulo}>Pague com PIX para concluir</h1>
                  {cobranca.pedido && <p className={s.pedido}>Pedido {cobranca.pedido}</p>}
                </div>
                <div className={`${s.relogio} ${acabando ? s.relogioAlerta : ""}`}>
                  <span className={s.relogioLabel}>{status === "expired" ? "expirado" : "expira em"}</span>
                  <span className={s.relogioTempo} suppressHydrationWarning>{mm}:{ss}</span>
                </div>
              </div>

              {status === "expired" ? (
                <p className={s.expirado}>
                  O tempo para pagar este código acabou. Volte à loja e refaça o pedido para gerar um novo PIX.
                </p>
              ) : (
                <>
                  <div className={s.corpo}>
                    <div className={s.qrBox}>
                      {cobranca.qr_code_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img className={s.qr} src={cobranca.qr_code_url} alt="QR Code para pagamento PIX" width={230} height={230} />
                      ) : (
                        <div className={s.qrVazio}>QR indisponível — use o código copia e cola</div>
                      )}
                      <span className={s.qrDica}>Aponte a câmera do app do banco</span>
                    </div>

                    <ol className={s.passos}>
                      {PASSOS.map((t, i) => (
                        <li key={i}><span className={s.passoNum}>{i + 1}</span>{t}</li>
                      ))}
                    </ol>
                  </div>

                  <div className={s.copiaBloco}>
                    <p className={s.copiaLabel}>Código copia e cola</p>
                    <input id="pix-codigo" className={s.copiaInput} value={cobranca.qr_code} readOnly
                      onFocus={(e) => e.currentTarget.select()} aria-label="Código PIX copia e cola" />
                    <button type="button" className={`${s.btnCopiar} ${copiado ? s.btnCopiado : ""}`} onClick={copiar}>
                      {copiado ? (
                        <><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg>Código copiado</>
                      ) : (
                        <><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>Copiar código PIX</>
                      )}
                    </button>
                  </div>

                  <p className={s.espera} aria-live="polite">
                    <span className={s.pulso} aria-hidden />
                    Assim que o banco confirmar, esta página muda sozinha. Pode deixar aberta.
                  </p>
                </>
              )}
            </section>

            {/* ---- resumo ---- */}
            <aside className={s.resumo}>
              <h2 className={s.resumoTitulo}>Resumo do pedido</h2>
              <div className={s.item}>
                <span className={s.thumb}>
                  <Image src={r.imagem} alt={produto.nome} width={64} height={64} sizes="64px" />
                  <span className={s.badge}>{r.qtd}</span>
                </span>
                <span className={s.itemInfo}>
                  <span className={s.itemNome}>{r.titulo}</span>
                  <span className={s.itemVar}>{r.kit.nome} · {r.kit.duracao.toLowerCase()}</span>
                </span>
                <span className={s.itemValor}>{moeda(r.subtotal)}</span>
              </div>

              <div className={s.linhas}>
                <p className={s.linha}><span>Subtotal</span><span>{moeda(r.subtotal)}</span></p>
                <p className={`${s.linha} ${s.linhaDesconto}`}><span>Desconto · PIX 5%</span><span>-{moeda(r.subtotal * 0.05)}</span></p>
                <p className={s.total}><span>Total</span><span>{reais(cobranca.total)}</span></p>
              </div>

              <ul className={s.garantias}>
                <li>Pagamento processado em ambiente seguro</li>
                <li>Frete econômico grátis para todo o Brasil</li>
                <li>7 dias para troca ou devolução</li>
              </ul>
            </aside>
          </div>
        )}
      </main>

      <SiteFooter />
      <PurchaseNotifications />
    </div>
  );
}
