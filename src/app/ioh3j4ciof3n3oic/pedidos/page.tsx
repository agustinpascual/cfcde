import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AvisoConfig from "@/components/painel/AvisoConfig";
import Casca from "@/components/painel/Casca";
import FaixaInstalar from "@/components/painel/FaixaInstalar";
import ExportarPedidos from "@/components/painel/ExportarPedidos";
import FiltroPedidos from "@/components/painel/FiltroPedidos";
import Paginacao from "@/components/painel/Paginacao";
import Recarrega from "@/components/painel/Recarrega";
import SubAbasPedidos from "@/components/painel/SubAbasPedidos";
import { pedidosComComprovante } from "@/components/painel/ComprovantePedido";
import { estadoInstalacao, configurado, lerAoVivo, lerCarrinhos, lerPaginaPedidos, moeda, POR_PAGINA } from "@/components/painel/dados";
import { autenticado, painelConfigurado } from "@/lib/painel-auth";
import { formatarDataHoraBrasilia } from "@/lib/data-brasilia";
import s from "@/components/painel/painel.module.css";

export const metadata: Metadata = { title: "Pedidos", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const SELO: Record<string, string> = {
  aprovado: s.seloAprovado, pendente: s.seloPendente,
  falhou: s.seloFalhou, recusado: s.seloFalhou, expirado: s.seloFalhou, estornado: s.seloNeutro,
};
const ROTULO: Record<string, string> = {
  aprovado: "Pago", pendente: "Aguardando", falhou: "Falhou",
  recusado: "Recusado", expirado: "Expirado", estornado: "Estornado",
};
const formaPagamento = (metodo: string) => metodo === "cartao" ? "Cartão · AxxonPay" : metodo === "cartao_sandbox" ? "Cartão sandbox" : "PIX";
const quando = (iso: string) =>
  formatarDataHoraBrasilia(iso, { year: "2-digit" });

export default async function Page({ searchParams }: { searchParams: Promise<{ p?: string; busca?: string; status?: string; metodo?: string; de?: string; ate?: string }> }) {
  if (!painelConfigurado()) redirect("/ioh3j4ciof3n3oic");
  if (!(await autenticado())) redirect("/ioh3j4ciof3n3oic/entrar");

  const sp = await searchParams;
  const pagina = Math.max(1, Number(sp.p) || 1);
  const filtros = { busca: sp.busca, status: sp.status, metodo: sp.metodo, de: sp.de, ate: sp.ate };
  const temFiltro = Boolean(sp.busca || sp.status || sp.metodo || sp.de || sp.ate);
  const [{ linhas: pedidos, total }, vivos, _inst, carrinhos] = await Promise.all([
    lerPaginaPedidos(pagina, filtros), lerAoVivo(), estadoInstalacao(), lerCarrinhos(),
  ]);
  const _faltam = _inst?.filter((t) => !t.existe || t.colunasFaltando.length).length ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const comprovantes = await pedidosComComprovante(pedidos.filter(p => p.metodo_pagamento === "pix").map(p => p.id));

  return (
    <Casca atual="/ioh3j4ciof3n3oic/pedidos" titulo="Pedidos"
      subtitulo={total === 0 ? "Nenhum pedido ainda"
        : `${total} ${total === 1 ? "pedido" : "pedidos"}${paginas > 1 ? ` · página ${pagina} de ${paginas}` : ""} · clique para ver os detalhes`}
      aoVivo={vivos.length}>
      <FaixaInstalar faltam={_faltam} />
      {/* Só pedidos aguardando confirmação precisam de acompanhamento curto.
          Sem pendências, evita refazer a lista e a contagem de abandonados a
          cada cinco segundos no celular. */}
      <Recarrega segundos={pedidos.some((pedido) => pedido.status === "pendente") ? 5 : 20} />
      <AvisoConfig faltando={configurado() ? [] : ["SUPABASE_SERVICE_ROLE_KEY"]} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <SubAbasPedidos atual="pedidos" abandonados={carrinhos.length} />
        <ExportarPedidos de={sp.de} ate={sp.ate} />
      </div>

      <FiltroPedidos busca={sp.busca} status={sp.status} metodo={sp.metodo} de={sp.de} ate={sp.ate} />

      <section className={`${s.cartao} ${s.cartaoTabela}`}>
        {pedidos.length === 0 ? (
          <p className={s.vazio}>
            {temFiltro
              ? "Nenhum pedido encontrado com esses filtros. Tente outro termo ou limpe os filtros."
              : total > 0
              ? "Esta página não existe mais. Volte para a primeira."
              : "Nenhum pedido ainda. Assim que alguém iniciar um pagamento no checkout, ele aparece aqui — e muda para “Pago” quando o gateway confirmar."}
          </p>
        ) : (
          <div className={s.tabelaWrap}>
            <table className={`${s.tabela} ${s.tabelaResponsiva} ${s.tabelaPedidos}`}>
              <thead>
                <tr>
                  <th>Pedido</th><th>Cliente</th><th>Status</th>
                  <th className={s.dir}>Valor</th><th>Data</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => (
                  <tr key={p.id} className={s.linhaPedido}>
                    <td className={s.mono} data-label="Pedido">
                      <Link href={`/ioh3j4ciof3n3oic/pedidos/${p.id}`} className={s.linkPedido}
                        aria-label={`Abrir pedido ${p.referencia}${p.cliente_nome ? ` de ${p.cliente_nome}` : ""}`}>
                        {p.referencia}
                      </Link>
                    </td>
                    <td data-label="Cliente">
                      {p.cliente_nome ?? "—"}
                      {p.cliente_email && <><br /><span className={s.mono}>{p.cliente_email}</span></>}
                    </td>
                    <td data-label="Status">
                      <span className={`${s.selo} ${SELO[p.status] ?? s.seloNeutro}`}>
                        {ROTULO[p.status] ?? p.status}
                      </span>
                      <span className={s.formaPgto}>{formaPagamento(p.metodo_pagamento)}</span>
                      {comprovantes.has(p.id) && <span className={`${s.selo} ${s.seloPendente}`}>{["aprovado", "estornado"].includes(p.status) ? "Comprovante anexado" : "⚠ Comprovante aguardando confirmação"}</span>}
                    </td>
                    <td className={s.dir} data-label="Valor"><strong>{moeda(p.valor_centavos)}</strong></td>
                    <td className={`${s.mono} ${s.pedidoData}`} data-label="Data">
                      {quando(p.criado_em)}<span className={s.pedidoSeta} aria-hidden>→</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Paginacao pagina={pagina} total={total} porPagina={POR_PAGINA} base="/ioh3j4ciof3n3oic/pedidos"
        query={{ busca: sp.busca, status: sp.status, metodo: sp.metodo, de: sp.de, ate: sp.ate }} />
    </Casca>
  );
}
