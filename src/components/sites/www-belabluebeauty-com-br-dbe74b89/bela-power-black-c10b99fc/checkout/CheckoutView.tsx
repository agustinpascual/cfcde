"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { IMG, descricao, produto, reviews } from "../data";
import { moeda, resumo, useCarrinho } from "../cart";
import { opcoesFrete } from "../data";
import PurchaseNotifications from "../PurchaseNotifications";
import SiteFooter from "../SiteFooter";
import { guardarCobranca } from "./cobranca";
import {
  celularValido, documentoValido, emailValido, mascaraCelular, mascaraCep,
  mascaraCpfCnpj, mascaraNascimento, nascimentoValido, nomeValido, soDigitos,
} from "./mascaras";
import s from "./checkout.module.css";

/* Checkout da loja.
   O pagamento é PIX real via PinPay: a cobrança é criada em /api/pix (rota de
   servidor) e o status é consultado por polling. A chave sk_ nunca chega ao
   browser e o valor é recalculado no servidor a partir da tabela de preços.
   Não há captura de dados de cartão nesta tela. */

type Endereco = { logradouro: string; bairro: string; localidade: string; uf: string };

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={s.securityIcon}>
    <path d="M12 3 4.5 6v5.5c0 4.7 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.8 7.5-9.5V6L12 3Z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </svg>
);

/* PIX é a única forma de pagamento e dá 5% de desconto. */
export const DESCONTO_PIX = 0.05;

const formasPagamento = [
  {
    id: "pix",
    nome: "PIX",
    selo: "5% OFF",
    detalhe: "Aprovação imediata e 5% de desconto já aplicado no total. O código é gerado na próxima etapa.",
  },
];


export default function CheckoutView() {
  const router = useRouter();
  const carrinho = useCarrinho();
  const r = useMemo(() => resumo(carrinho), [carrinho]);

  const [email, setEmail] = useState("");
  const [emailOk, setEmailOk] = useState(false);

  /* dados pessoais — liberados assim que o e-mail é confirmado.
     Ficam apenas em memória: nada é enviado nem gravado. */
  const [nome, setNome] = useState("");
  const [doc, setDoc] = useState("");
  const [celular, setCelular] = useState("");
  const [nascimento, setNascimento] = useState("");

  const [cep, setCep] = useState("");
  const [cepErro, setCepErro] = useState("");
  const [endereco, setEndereco] = useState<Endereco | null>(null);
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [envio, setEnvio] = useState<string>("");
  const [buscando, setBuscando] = useState(false);
  const [obsAberta, setObsAberta] = useState(false);
  const [pagamento, setPagamento] = useState("pix");
  const [cupom, setCupom] = useState("");
  const [avalIndice, setAvalIndice] = useState(0);
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [erroPix, setErroPix] = useState("");
  const [pausado, setPausado] = useState(false);
  const avalRef = useRef<HTMLDivElement>(null);


  const timerEmail = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* marca que o próximo render deve levar o cursor para o campo Nome */
  const focarNome = useRef(false);
  const ultimoCep = useRef("");
  /* marca que o próximo render deve levar o cursor para o campo Número */
  const focarNumero = useRef(false);

  /* Dispara sozinho quando o CEP fica completo (8 dígitos). */
  async function buscarCep(digitos: string) {
    if (digitos === ultimoCep.current) return;
    ultimoCep.current = digitos;
    setCepErro(""); setBuscando(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
      const dados = await res.json();
      if (dados.erro) { setCepErro("CEP não encontrado."); setEndereco(null); return; }
      setEndereco({
        logradouro: dados.logradouro || "",
        bairro: dados.bairro || "",
        localidade: dados.localidade || "",
        uf: dados.uf || "",
      });
      setEnvio((v) => v || opcoesFrete[0].id);
      focarNumero.current = true;
    } catch {
      setCepErro("Não foi possível consultar o CEP agora.");
      ultimoCep.current = "";
    } finally {
      setBuscando(false);
    }
  }

  /* Abre os campos assim que o e-mail fica válido, mas SÓ move o cursor
     quando a pessoa sinaliza que terminou (sair do campo ou Enter).
     Roubar o foco por timer fazia o resto do que ela digitava — ".br" de
     "@gmail.com.br", por exemplo — cair no campo Nome. */
  function revelarCampos(v: string) {
    setEmailOk(emailValido(v));
  }

  function concluirEmail(v: string) {
    if (!emailValido(v)) { setEmailOk(false); return; }
    if (!emailOk) focarNome.current = true;
    setEmailOk(true);
  }

  function aoDigitarEmail(v: string) {
    setEmail(v);
    if (timerEmail.current) clearTimeout(timerEmail.current);
    if (!emailValido(v)) { setEmailOk(false); return; }
    timerEmail.current = setTimeout(() => revelarCampos(v), 700);
  }

  function aoDigitarCep(valor: string) {
    const mascarado = mascaraCep(valor);
    setCep(mascarado);
    const d = soDigitos(mascarado);
    if (d.length < 8) { setEndereco(null); setCepErro(""); ultimoCep.current = ""; return; }
    void buscarCep(d);
  }

  /* Gera a cobrança PIX. O valor NÃO é enviado: o servidor recalcula a
     partir do kit, da quantidade e do frete. */
  async function finalizar() {
    setErroPix(""); setGerando(true);
    try {
      const r = await fetch("/api/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome, email, documento: doc, celular, nascimento,
          kitIndex: carrinho.kitIndex, qtd: carrinho.qtd, frete: envio,
          endereco: endereco
            ? { ...endereco, cep, numero, complemento }
            : null,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setErroPix(d.erro ?? "Não foi possível gerar o PIX."); return; }
      // guarda para a página de pagamento abrir instantânea, sem novo request
      guardarCobranca(d);
      router.push(`/pagamento/${d.id}`);
    } catch {
      setErroPix("Falha de conexão. Tente novamente.");
    } finally {
      setGerando(false);
    }
  }

  /* o carrossel de depoimentos gira sozinho; para no hover e com prefers-reduced-motion */
  useEffect(() => {
    if (pausado) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setAvalIndice((v) => (v + 2) % reviews.length), 5000);
    return () => clearInterval(id);
  }, [pausado]);

  const freteEscolhido = opcoesFrete.find((o) => o.id === envio) ?? null;
  const descontoPix = pagamento === "pix" ? r.subtotal * DESCONTO_PIX : 0;
  const total = r.subtotal - descontoPix + (freteEscolhido?.preco ?? 0);

  const avalVisiveis = [reviews[avalIndice % reviews.length], reviews[(avalIndice + 1) % reviews.length]];
  const dadosOk = nomeValido(nome) && documentoValido(doc) && celularValido(celular) && nascimentoValido(nascimento);
  const enderecoOk = !!endereco && numero.trim().length > 0;
  const podeFinalizar = emailOk && dadosOk && enderecoOk && !!envio && !!pagamento;

  return (
    <div className={s.pagina}>
      <header className={s.topo}>
        <div className={`bb-container ${s.topoInner}`}>
          <Link href="/" className={s.topoLogo}>
            <Image src={`${IMG}/00-comprar-bela-power-black-prazo-e.png`} alt="Bela Blue Beauty" width={75} height={44} priority sizes="75px" />
          </Link>
          <div className={s.security}>
            <ShieldIcon />
            <div>
              <div className={s.securityT}>Compre com tranquilidade</div>
              <div className={s.securityB}>Loja 100% segura</div>
            </div>
          </div>
        </div>
      </header>

      <section className={s.secao}>
        <div className="bb-container">
          {/* ---------- carrinho recolhível (fechado por padrão) ---------- */}
          <div className={`${s.carrinho} ${carrinhoAberto ? s.carrinhoAberto : ""}`}>
            <button type="button" className={s.carrinhoBarra}
              aria-expanded={carrinhoAberto} aria-controls="co-carrinho"
              onClick={() => setCarrinhoAberto((v) => !v)}>
              <span className={s.carrinhoEsq}>
                <svg className={s.carrinhoIcone} viewBox="0 0 24 24" width="20" height="20" fill="none"
                  stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M2 3h3l2.6 12h10.2l2.2-8H6.2" /><circle cx="10" cy="20" r="1.6" /><circle cx="18" cy="20" r="1.6" />
                </svg>
                <span className={s.carrinhoLabel}>
                  {carrinhoAberto ? "Ocultar" : "Mostrar"} resumo do pedido
                  <span className={s.carrinhoQtd}>· {r.qtd} {r.qtd === 1 ? "item" : "itens"}</span>
                </span>
                <svg className={s.carrinhoSeta} viewBox="0 0 24 24" width="18" height="18" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
              <span className={s.carrinhoTotal}>{moeda(total)}</span>
            </button>

            <div id="co-carrinho" className={s.carrinhoCorpo} hidden={!carrinhoAberto}>
              <div className={s.itemLinha}>
                <span className={s.thumb}>
                  <Image src={r.imagem} alt={produto.nome} width={72} height={72} sizes="72px" />
                  <span className={s.badge}>{r.qtd}</span>
                </span>
                <span className={s.det}>
                  <span>
                    <span className={s.produtoNome}>{r.titulo}</span>
                    <span className={s.produtoVariacao}>{r.kit.nome} · {r.kit.duracao.toLowerCase()}</span>
                    <span className={s.produtoDesc}>{descricao.subtitulo}</span>
                  </span>
                  <span className={s.valores}>
                    <span className={s.valorOriginal}>{moeda(r.original)}</span>
                    <span className={s.valorParcial}>{moeda(r.subtotal)}</span>
                  </span>
                </span>
              </div>

              <form className={s.cupomForm} onSubmit={(e) => e.preventDefault()}>
                <input className={s.cupomInput} placeholder="Cupom de desconto" value={cupom}
                  onChange={(e) => setCupom(e.target.value)} aria-label="Cupom de desconto" />
                <button className={s.btnEscuro} type="submit">Aplicar</button>
              </form>

              <div className={s.dropFooter}>
                <p className={s.totalLinha}><span>Subtotal · {r.qtd} {r.qtd === 1 ? "item" : "itens"}</span><span>{moeda(r.subtotal)}</span></p>
                <p className={`${s.totalLinha} ${descontoPix > 0 ? s.linhaDesconto : ""}`}>
                  <span>Desconto{descontoPix > 0 ? " · PIX 5%" : ""}</span>
                  <span>-{moeda(descontoPix)}</span>
                </p>
                <p className={s.totalLinha}>
                  <span>Frete</span>
                  <span>{freteEscolhido ? (freteEscolhido.preco === 0 ? "Grátis" : moeda(freteEscolhido.preco)) : "A calcular"}</span>
                </p>
                <p className={s.totalFinal}><span>Total</span><span>{moeda(total)}</span></p>
              </div>
            </div>
          </div>

          <div className={s.colunas}>
            {/* ---------- formulário ---------- */}
            <div className={s.main}>
              <div className={s.grupo}>
                <div className={s.grupoTitulo}>
                  <span>Contato</span>
                </div>
                <div className={s.campo}>
                  <label className={s.rotulo} htmlFor="co-email">E-mail <em>*</em></label>
                  <input id="co-email" className={`${s.input} ${email && !emailValido(email) ? s.inputErro : ""}`}
                    type="email" value={email} autoComplete="email" inputMode="email"
                    onChange={(ev) => aoDigitarEmail(ev.target.value)}
                    onBlur={(ev) => concluirEmail(ev.target.value)}
                    onKeyDown={(ev) => { if (ev.key === "Enter") { ev.preventDefault(); concluirEmail(email); } }} />
                </div>
                {emailOk && (
                  <>
                    <p className={s.ok}>✓ E-mail confirmado</p>
                    <div className={s.grade}>
                      <div className={`${s.campo} ${s.campoLargo}`}>
                        <label className={s.rotulo} htmlFor="co-nome">Nome completo ou razão social <em>*</em></label>
                        <input id="co-nome" className={`${s.input} ${nome && !nomeValido(nome) ? s.inputErro : ""}`}
                          value={nome} autoComplete="name" placeholder="Ex.: Maria Aparecida Souza"
                          ref={(el) => {
                            /* assim que o e-mail é confirmado, o cursor já cai aqui */
                            if (el && focarNome.current) { focarNome.current = false; el.focus(); }
                          }}
                          onChange={(ev) => setNome(ev.target.value)} />
                      </div>
                      <div className={s.campo}>
                        <label className={s.rotulo} htmlFor="co-doc">CPF ou CNPJ <em>*</em></label>
                        <input id="co-doc" className={`${s.input} ${doc && !documentoValido(doc) ? s.inputErro : ""}`}
                          value={doc} inputMode="numeric" onChange={(ev) => setDoc(mascaraCpfCnpj(ev.target.value))} />
                      </div>
                      <div className={s.campo}>
                        <label className={s.rotulo} htmlFor="co-cel">Celular <em>*</em></label>
                        <input id="co-cel" className={`${s.input} ${celular && !celularValido(celular) ? s.inputErro : ""}`}
                          value={celular} inputMode="tel" autoComplete="tel"
                          onChange={(ev) => setCelular(mascaraCelular(ev.target.value))} />
                      </div>
                      <div className={s.campo}>
                        <label className={s.rotulo} htmlFor="co-nasc">Data de nascimento <em>*</em></label>
                        <input id="co-nasc" className={`${s.input} ${nascimento && !nascimentoValido(nascimento) ? s.inputErro : ""}`}
                          value={nascimento} inputMode="numeric" placeholder="dd/mm/aaaa"
                          onChange={(ev) => setNascimento(mascaraNascimento(ev.target.value))} />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className={s.grupo}>
                <div className={s.grupoTitulo}>
                  <span>Escolha a forma de envio</span>
                  <span className={s.grupoLink}>Não sei o CEP</span>
                </div>
                <div className={s.campo}>
                  <label className={s.rotulo} htmlFor="co-cep">CEP <em>*</em></label>
                  <input id="co-cep" className={`${s.input} ${cepErro ? s.inputErro : ""}`} value={cep}
                    inputMode="numeric" autoComplete="postal-code" maxLength={9}
                    aria-busy={buscando}
                    onChange={(ev) => aoDigitarCep(ev.target.value)} />
                  {buscando && <span className={s.campoSpinner} aria-label="Consultando CEP" />}
                </div>
                {cepErro && <p className={s.erro} role="alert">{cepErro}</p>}
                {endereco && (
                  <>
                    <p className={s.ok}>✓ Endereço encontrado</p>

                    <div className={s.grade}>
                      <div className={`${s.campo} ${s.campoLargo}`}>
                        <label className={s.rotulo}>Endereço</label>
                        <input className={s.input} value={endereco.logradouro} readOnly />
                      </div>
                      <div className={s.campo}>
                        <label className={s.rotulo} htmlFor="co-num">Número <em>*</em></label>
                        <input id="co-num" className={s.input} value={numero} inputMode="numeric"
                          placeholder="Ex.: 123"
                          ref={(el) => {
                            /* assim que o endereço é encontrado, o cursor já cai aqui */
                            if (el && focarNumero.current) { focarNumero.current = false; el.focus(); }
                          }}
                          onChange={(ev) => setNumero(ev.target.value)} />
                      </div>
                      <div className={s.campo}>
                        <label className={s.rotulo} htmlFor="co-compl">Complemento</label>
                        <input id="co-compl" className={s.input} value={complemento}
                          onChange={(ev) => setComplemento(ev.target.value)} />
                      </div>
                      <div className={s.campo}>
                        <label className={s.rotulo}>Bairro</label>
                        <input className={s.input} value={endereco.bairro} readOnly />
                      </div>
                      <div className={s.campo}>
                        <label className={s.rotulo}>Cidade</label>
                        <input className={s.input} value={endereco.localidade} readOnly />
                      </div>
                      <div className={s.campoUf}>
                        <label className={s.rotulo}>UF</label>
                        <input className={s.input} value={endereco.uf} readOnly />
                      </div>
                    </div>
                    <div className={s.listaEnvio} role="radiogroup" aria-label="Forma de envio">
                      {opcoesFrete.map((o) => (
                        <label key={o.id} className={`${s.envioItem} ${envio === o.id ? s.envioItemAtivo : ""}`}>
                          <input className={s.pagRadio} type="radio" name="envio" value={o.id}
                            checked={envio === o.id} onChange={() => setEnvio(o.id)} />
                          <span className={s.envioNome}>
                            {o.nome}
                            {o.destaque && <span className={s.envioTag}>mais rápido</span>}
                          </span>
                          <span className={s.envioPrazo}>{o.min} a {o.max} dias úteis</span>
                          <span className={`${s.envioPreco} ${o.preco === 0 ? s.envioGratis : ""}`}>
                            {o.preco === 0 ? "Grátis" : moeda(o.preco)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className={s.grupo}>
                <label className={s.checkbox}>
                  <input type="checkbox" checked={obsAberta} onChange={(e) => setObsAberta(e.target.checked)} />
                  Deseja nos informar algo?
                </label>
                {obsAberta && <textarea className={s.obs} placeholder="Escreva sua observação sobre o pedido" />}
              </div>

              <div className={s.grupo}>
                <div className={s.grupoTitulo}><span>Pagamento</span></div>
                <p className={s.pagSub}>Todas as transações são seguras e criptografadas.</p>

                <div className={s.listaPag} role="radiogroup" aria-label="Forma de pagamento">
                  {formasPagamento.map((f) => (
                    <div key={f.id}>
                      <label className={`${s.pagItem} ${pagamento === f.id ? s.pagItemAtivo : ""}`}>
                        <input className={s.pagRadio} type="radio" name="pagamento" value={f.id}
                          checked={pagamento === f.id} onChange={() => setPagamento(f.id)} />
                        <span className={s.pagNome}>
                          <Image src={`${IMG}/61-pix.png`} alt="" width={30} height={17} sizes="30px" className={s.pagIcone} />
                          {f.nome}
                        </span>
                        <span className={s.pagSelo}>{f.selo}</span>
                      </label>
                      {pagamento === f.id && <p className={s.pagDetalhe}>{f.detalhe}</p>}
                    </div>
                  ))}
                </div>

                <button className={s.btnFinalizar} disabled={!podeFinalizar || gerando} onClick={finalizar}>
                  {gerando ? "Gerando PIX…" : "Finalizar compra"}
                </button>
                {erroPix && <p className={s.erro} role="alert">{erroPix}</p>}
              </div>

            </div>

            {/* ---------- prova social ---------- */}
            <aside className={s.resumo}>
              <p className={s.asideTitulo}>Quem já comprou <span className={s.asideQtd}>({reviews.length})</span></p>
              <div className={s.avaliacoesCheckout} ref={avalRef}
                onMouseEnter={() => setPausado(true)} onMouseLeave={() => setPausado(false)}>
                {avalVisiveis.map((a, i) => (
                  <article key={`${avalIndice}-${i}`} className={s.avalItem}>
                    <div className={s.avalProduto}>{produto.nome}</div>
                    <div className={s.avalVoto}>★★★★★</div>
                    <div className={s.avalComentario}>{a.texto}</div>
                    <div className={s.avalNome}>{a.autor}</div>
                  </article>
                ))}
              </div>
              <div className={s.avalProgresso} aria-hidden>
                <span className={s.avalProgressoFill} style={{ width: `${((avalIndice / 2 % Math.ceil(reviews.length / 2)) + 1) / Math.ceil(reviews.length / 2) * 100}%` }} />
              </div>
              <div className={s.avalNav}>
                <button className={s.avalBtn} aria-label="Avaliação anterior"
                  onClick={() => setAvalIndice((v) => (v - 2 + reviews.length) % reviews.length)}>‹</button>
                <button className={s.avalBtn} aria-label="Próxima avaliação"
                  onClick={() => setAvalIndice((v) => (v + 2) % reviews.length)}>›</button>
              </div>

              <ul className={s.garantias}>
                <li>🔒 Pagamento processado em ambiente seguro</li>
                <li>🚚 Frete econômico grátis para todo o Brasil</li>
                <li>↩️ 7 dias para troca ou devolução</li>
              </ul>
            </aside>
          </div>
        </div>
      </section>
      <SiteFooter />
      <PurchaseNotifications />
    </div>
  );
}
