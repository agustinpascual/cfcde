import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AvisoConfig from "@/components/painel/AvisoConfig";
import AcessosDispositivos from "@/components/painel/AcessosDispositivos";
import Casca from "@/components/painel/Casca";
import FaixaInstalar from "@/components/painel/FaixaInstalar";
import { AreaTempo, BarrasH } from "@/components/painel/Grafico";
import FiltroPeriodo from "@/components/painel/FiltroPeriodo";
import MapaBrasil from "@/components/painel/MapaBrasil";
import Recarrega from "@/components/painel/Recarrega";
import { dispositivoAndroid, dispositivoApple, estadoInstalacao, configurado, hojeNoPainel, lerAoVivo, lerFunil, lerResumo, lerVendasPorDia, moeda, resolverPeriodo, rotuloDispositivo } from "@/components/painel/dados";
import { contarDispositivos } from "@/lib/dispositivos";
import { autenticado, painelConfigurado } from "@/lib/painel-auth";
import s from "@/components/painel/painel.module.css";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const NOME_PAGINA: Record<string, string> = {
  "/": "Página inicial", "/checkout": "Checkout", "/contato": "Contato",
  "/sobre": "Sobre nós", "/duvidas-frequentes": "Dúvidas frequentes",
};
const nomearPagina = (pagina: string | null) =>
  !pagina ? "Página desconhecida"
    : pagina.startsWith("/pagamento") ? "Tela de pagamento"
      : NOME_PAGINA[pagina] ?? pagina;
const tempoOnline = (segundos: number) =>
  segundos < 60 ? `${segundos}s`
    : segundos < 3600 ? `${Math.floor(segundos / 60)} min`
      : `${Math.floor(segundos / 3600)} h`;

export default async function Page({ searchParams }: {
  searchParams: Promise<{ periodo?: string; de?: string; ate?: string }>;
}) {
  if (!painelConfigurado()) return <SemSenha />;
  if (!(await autenticado())) redirect("/painel/entrar");

  const periodo = resolverPeriodo(await searchParams);
  const [resumo, dias, funil, vivos] = await Promise.all([
    lerResumo(periodo), lerVendasPorDia(periodo), lerFunil(periodo), lerAoVivo(),
  ]);

  const faltando: string[] = [];
  if (!configurado()) faltando.push("SUPABASE_SERVICE_ROLE_KEY");

  const serie = dias.map((d) => ({
    rotulo: new Date(d.dia + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    valor: d.receita_centavos / 100,
  }));

  const pct = (n: number) => (funil.visitantes ? `${Math.round((n / funil.visitantes) * 100)}%` : "—");
  const etapas = [
    { rotulo: "Visitantes", valor: funil.visitantes },
    { rotulo: "Checkout", valor: funil.checkout, nota: pct(funil.checkout) },
    { rotulo: "PIX gerado", valor: funil.pix_gerado, nota: pct(funil.pix_gerado) },
    { rotulo: "PIX copiado", valor: funil.pix_copiado, nota: pct(funil.pix_copiado) },
    { rotulo: "Compras", valor: funil.compras, nota: pct(funil.compras) },
  ];

  const ticket = resumo.pedidos_pagos ? resumo.receita_centavos / resumo.pedidos_pagos : 0;
  const noCheckout = vivos.filter((v) => v.pagina?.startsWith("/checkout")).length;
  const noPagamento = vivos.filter((v) => v.pagina?.startsWith("/pagamento")).length;
  const copiaramPix = vivos.filter((v) => v.copiou_pix).length;
  const apple = vivos.filter((v) => dispositivoApple(v.dispositivo)).length;
  const android = vivos.filter((v) => dispositivoAndroid(v.dispositivo)).length;
  const computadores = contarDispositivos(vivos).computador;
  const outrosDispositivos = Math.max(0, vivos.length - apple - android - computadores);
  const conversao = funil.visitantes ? (funil.compras / funil.visitantes) * 100 : 0;

  const _inst = await estadoInstalacao();

  const _faltam = _inst?.filter((t) => !t.existe || t.colunasFaltando.length).length ?? 0;


  return (
    <Casca atual="/painel" titulo="Dashboard" subtitulo={`Visão geral da operação · ${periodo.rotulo}`} aoVivo={vivos.length}>
      <FaixaInstalar faltam={_faltam} />
      <AvisoConfig faltando={faltando} />
      <Recarrega segundos={15} />

      <FiltroPeriodo de={periodo.de} ate={periodo.ate} hoje={hojeNoPainel()} />

      <section className={s.financeiro} aria-labelledby="resumo-financeiro">
        <div className={s.financeiroCabecalho}>
          <div>
            <p className={s.sobretitulo}>Visão financeira</p>
            <h2 id="resumo-financeiro" className={s.financeiroTitulo}>O que realmente entra no caixa</h2>
          </div>
          <span className={s.taxaRegra}>Gateway · 5,99% + R$ 1,50 por transação</span>
        </div>

        <div className={s.financeiroGrade}>
          <article className={s.financeiroItem}>
            <p className={s.financeiroRotulo}>Receita bruta</p>
            <p className={s.financeiroValor}>{moeda(resumo.receita_centavos)}</p>
            <p className={s.financeiroNota}>{resumo.pedidos_pagos} {resumo.pedidos_pagos === 1 ? "pedido pago" : "pedidos pagos"}</p>
          </article>

          <article className={`${s.financeiroItem} ${s.financeiroTaxas}`}>
            <p className={s.financeiroRotulo}>Taxas pagas ao gateway</p>
            <p className={s.financeiroValor}>− {moeda(resumo.taxas_gateway_centavos)}</p>
            <dl className={s.taxaDetalhes}>
              <div><dt>Percentual (5,99%)</dt><dd>{moeda(resumo.taxa_gateway_percentual_centavos)}</dd></div>
              <div><dt>Fixa ({resumo.pedidos_pagos} × R$ 1,50)</dt><dd>{moeda(resumo.taxa_gateway_fixa_centavos)}</dd></div>
            </dl>
          </article>

          <article className={`${s.financeiroItem} ${s.financeiroLiquido}`}>
            <p className={s.financeiroRotulo}>Valor líquido estimado</p>
            <p className={s.financeiroValor}>{moeda(resumo.receita_liquida_centavos)}</p>
            <p className={s.financeiroNota}>bruto menos as taxas do gateway</p>
          </article>
        </div>
      </section>

      <div className={`${s.kpis} ${s.kpisCompactos}`}>
        <Kpi rotulo="Receita hoje" valor={moeda(resumo.receita_hoje_centavos)} nota={`${resumo.pedidos_hoje} pedidos hoje`} />
        <Kpi rotulo="Ticket médio" valor={moeda(ticket)} nota="por pedido pago" />
        <Kpi rotulo="Aguardando pagamento" valor={String(resumo.pedidos_pendentes)} nota="PIX gerado sem confirmação" />
        <Kpi rotulo="Conversão" valor={`${conversao.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`} nota={`compras · ${periodo.rotulo.toLowerCase()}`} />
      </div>

      <AcessosDispositivos periodo={periodo} online={vivos} />

      <div className={s.grade}>
        <section className={s.cartao}>
          <h2 className={s.cartaoTitulo}>Faturamento bruto por dia</h2>
          <p className={s.cartaoSub}>{periodo.rotulo} · pedidos aprovados antes das taxas</p>
          <AreaTempo dados={serie} formato="moeda" />
        </section>

        <section className={s.cartao}>
          <h2 className={s.cartaoTitulo}>Funil de conversão</h2>
          <p className={s.cartaoSub}>{periodo.rotulo} · compras confirmadas pelo gateway</p>
          <BarrasH dados={etapas} formato="numero" />
        </section>
      </div>

      <section id="agora" className={`${s.cartao} ${s.tempoReal}`} aria-labelledby="titulo-tempo-real">
        <div className={s.tempoRealCabecalho}>
          <div>
            <p className={s.sobretitulo}>Em tempo real</p>
            <h2 id="titulo-tempo-real" className={s.tempoRealTitulo}>O que está acontecendo na loja agora</h2>
            <p className={s.tempoRealSub}>Atualização automática a cada 15 segundos</p>
          </div>
          <span className={s.onlineBadge}><i aria-hidden />{vivos.length} online</span>
        </div>

        <div className={s.tempoRealKpis}>
          <MiniKpi rotulo="Navegando" valor={vivos.length - noCheckout - noPagamento} />
          <MiniKpi rotulo="No checkout" valor={noCheckout} />
          <MiniKpi rotulo="Na tela do PIX" valor={noPagamento} />
          <MiniKpi rotulo="Copiaram o PIX" valor={copiaramPix} destaque />
        </div>

        <div className={s.dispositivosFaixa} aria-label="Dispositivos online">
          <p>Dispositivos agora</p>
          <span><i className={s.apple} aria-hidden />Apple / iOS <strong>{apple}</strong></span>
          <span><i className={s.android} aria-hidden />Android <strong>{android}</strong></span>
          <span><i className={s.computador} aria-hidden />Computador <strong>{computadores}</strong></span>
          {outrosDispositivos > 0 && <span><i aria-hidden />Outros <strong>{outrosDispositivos}</strong></span>}
        </div>

        <div className={s.tempoRealGrade}>
          <div className={s.mapaPainel}>
            <h3>Localização das sessões</h3>
            <p>Posição aproximada por cidade</p>
            <MapaBrasil sessoes={vivos} />
          </div>

          <div className={s.atividadePainel}>
            <div className={s.atividadeCabecalho}>
              <div><h3>Atividade atual</h3><p>Últimas sessões detectadas</p></div>
              <span>{vivos.length}</span>
            </div>
            {vivos.length === 0 ? (
              <div className={s.atividadeVazia}><i aria-hidden /><p>Ninguém navegando no momento.</p></div>
            ) : (
              <ul className={s.atividadeLista}>
                {vivos.slice(0, 8).map((v) => {
                  const noPix = v.pagina?.startsWith("/pagamento");
                  const checkout = v.pagina?.startsWith("/checkout");
                  return (
                    <li key={v.sessao}>
                      <span className={`${s.atividadePonto} ${v.copiou_pix ? s.pontoPix : noPix || checkout ? s.pontoCheckout : ""}`} aria-hidden />
                      <div className={s.atividadeInfo}>
                        <strong>{nomearPagina(v.pagina)}</strong>
                        <span>{rotuloDispositivo(v.dispositivo)} · {v.cidade ? `${v.cidade}${v.uf ? `/${v.uf}` : ""}` : "localização indisponível"}</span>
                      </div>
                      <span className={s.atividadeEstado}>{v.copiou_pix ? "PIX copiado" : noPix ? "Pagamento" : checkout ? "Checkout" : "Navegando"}</span>
                      <time>{tempoOnline(v.segundos_no_site)}</time>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>
    </Casca>
  );
}

function Kpi({ rotulo, valor, nota, vivo }: { rotulo: string; valor: string; nota: string; vivo?: boolean }) {
  return (
    <div className={`${s.kpi} ${vivo ? s.kpiVivo : ""}`}>
      <p className={s.kpiRotulo}>{rotulo}</p>
      <p className={s.kpiValor}>{valor}</p>
      <p className={s.kpiNota}>{nota}</p>
    </div>
  );
}

function MiniKpi({ rotulo, valor, destaque }: { rotulo: string; valor: number; destaque?: boolean }) {
  return (
    <div className={destaque ? s.miniKpiDestaque : ""}>
      <p>{rotulo}</p><strong>{valor}</strong>
    </div>
  );
}

function SemSenha() {
  return (
    <div className={s.app}>
      <div className={s.conteudo}>
        <main className={s.corpo}>
          <div className={s.aviso}>
            <p className={s.avisoTitulo}>Painel sem credenciais configuradas</p>
            <p>
              Defina <code>PAINEL_EMAIL</code> e <code>PAINEL_SENHA</code> no <code>.env.local</code>
              {" "}(e nas variáveis do Vercel) para liberar o acesso. Sem isso o painel fica bloqueado —
              se ficasse aberto, qualquer pessoa com a URL veria os pedidos.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
