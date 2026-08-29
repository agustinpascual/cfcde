import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AvisoConfig from "@/components/painel/AvisoConfig";
import Casca from "@/components/painel/Casca";
import FaixaInstalar from "@/components/painel/FaixaInstalar";
import { AreaTempo, BarrasH } from "@/components/painel/Grafico";
import FiltroPeriodo from "@/components/painel/FiltroPeriodo";
import { estadoInstalacao, configurado, lerAoVivo, lerFunil, lerResumo, lerVendasPorDia, moeda, resolverPeriodo } from "@/components/painel/dados";
import { autenticado, painelConfigurado } from "@/lib/painel-auth";
import s from "@/components/painel/painel.module.css";

export const metadata: Metadata = { title: "Vendas", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: {
  searchParams: Promise<{ periodo?: string; de?: string; ate?: string }>;
}) {
  if (!painelConfigurado()) return <SemSenha />;
  if (!(await autenticado())) redirect("/painel/entrar");

  const periodo = resolverPeriodo(await searchParams);
  const [resumo, dias, funil, vivos] = await Promise.all([
    lerResumo(periodo), lerVendasPorDia(periodo), lerFunil(), lerAoVivo(),
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

  const porDispositivo = ["desktop", "mobile", "tablet"].map((d) => ({
    rotulo: d === "desktop" ? "Computador" : d === "mobile" ? "Celular" : "Tablet",
    valor: vivos.filter((v) => v.dispositivo === d).length,
  }));

  const ticket = resumo.pedidos_pagos ? resumo.receita_centavos / resumo.pedidos_pagos : 0;

  const _inst = await estadoInstalacao();

  const _faltam = _inst?.filter((t) => !t.existe).length ?? 0;


  return (
    <Casca atual="/painel" titulo="Vendas" subtitulo={`Resumo do desempenho · ${periodo.rotulo}`} aoVivo={vivos.length}>
      <FaixaInstalar faltam={_faltam} />
      <AvisoConfig faltando={faltando} />

      <FiltroPeriodo de={periodo.de} ate={periodo.ate} />

      <div className={s.kpis}>
        <Kpi rotulo="Receita no período" valor={moeda(resumo.receita_centavos)} nota={`${resumo.pedidos_pagos} pedidos pagos`} />
        <Kpi rotulo="Receita hoje" valor={moeda(resumo.receita_hoje_centavos)} nota={`${resumo.pedidos_hoje} pedidos hoje`} />
        <Kpi rotulo="Ticket médio" valor={moeda(ticket)} nota="por pedido pago" />
        <Kpi rotulo="Aguardando pagamento" valor={String(resumo.pedidos_pendentes)} nota="PIX gerado sem confirmação" />
        <Kpi rotulo="Online agora" valor={String(vivos.length)} nota={`${vivos.filter((v) => v.pagina?.startsWith("/checkout")).length} no checkout`} vivo />
      </div>

      <div className={s.grade}>
        <section className={s.cartao}>
          <h2 className={s.cartaoTitulo}>Receita por dia</h2>
          <p className={s.cartaoSub}>{periodo.rotulo} · apenas pedidos aprovados</p>
          <AreaTempo dados={serie} formato="moeda" />
        </section>

        <section className={s.cartao}>
          <h2 className={s.cartaoTitulo}>Funil de conversão</h2>
          <p className={s.cartaoSub}>Sessões distintas nas últimas 24 horas</p>
          <BarrasH dados={etapas} formato="numero" />
        </section>
      </div>

      <div className={s.grade}>
        <section className={s.cartao}>
          <h2 className={s.cartaoTitulo}>Onde as pessoas estão agora</h2>
          <p className={s.cartaoSub}>Sessões ativas por página</p>
          <BarrasH cor={1}
            dados={Object.entries(vivos.reduce<Record<string, number>>((a, v) => {
              const p = v.pagina ?? "(desconhecida)";
              a[p] = (a[p] ?? 0) + 1; return a;
            }, {})).map(([rotulo, valor]) => ({ rotulo, valor })).sort((a, b) => b.valor - a.valor)}
            formato="numero" />
        </section>

        <section className={s.cartao}>
          <h2 className={s.cartaoTitulo}>Dispositivos online</h2>
          <p className={s.cartaoSub}>Distribuição das sessões ativas</p>
          <BarrasH dados={porDispositivo} formato="numero" cor={2} />
        </section>
      </div>
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
