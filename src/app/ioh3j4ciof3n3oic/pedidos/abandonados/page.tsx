import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Casca from "@/components/painel/Casca";
import FiltroCarrinhos from "@/components/painel/FiltroCarrinhos";
import Paginacao from "@/components/painel/Paginacao";
import Recarrega from "@/components/painel/Recarrega";
import SubAbasPedidos from "@/components/painel/SubAbasPedidos";
import { hojeNoPainel, lerAoVivo, lerPaginaCarrinhos, moeda, POR_PAGINA, resolverPeriodo, rotuloDispositivo } from "@/components/painel/dados";
import { autenticado, painelConfigurado } from "@/lib/painel-auth";
import { formatarDataHoraBrasilia } from "@/lib/data-brasilia";
import s from "@/components/painel/painel.module.css";

export const metadata: Metadata = { title: "Carrinhos abandonados", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const quando = (iso: string) =>
  formatarDataHoraBrasilia(iso, { year: "2-digit" });

const tel = (v: string | null) => {
  if (!v) return null;
  const n = v.replace(/\D/g, "");
  return n.length >= 10 ? n.replace(/^(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3") : v;
};

type Busca = { p?: string; de?: string; ate?: string; etapa?: string };

export default async function Page({ searchParams }: { searchParams: Promise<Busca> }) {
  if (!painelConfigurado()) redirect("/ioh3j4ciof3n3oic");
  if (!(await autenticado())) redirect("/ioh3j4ciof3n3oic/entrar");

  const sp = await searchParams;
  const pagina = Math.max(1, Number(sp.p) || 1);
  const periodo = resolverPeriodo({ de: sp.de, ate: sp.ate });
  const etapa = ["contato", "entrega", "pagamento"].includes(sp.etapa ?? "") ? sp.etapa : undefined;
  const [resultado, vivos] = await Promise.all([
    lerPaginaCarrinhos(pagina, { de: periodo.de, ate: periodo.ate, etapa }),
    lerAoVivo(),
  ]);
  const { carrinhos, total, erro } = resultado;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <Casca atual="/ioh3j4ciof3n3oic/pedidos" titulo="Pedidos"
      subtitulo={erro ? "Não foi possível consultar os carrinhos"
        : total === 0 ? `Nenhum carrinho abandonado em ${periodo.rotulo.toLocaleLowerCase("pt-BR")}`
        : `${total} ${total === 1 ? "carrinho abandonado" : "carrinhos abandonados"}${paginas > 1 ? ` · página ${pagina} de ${paginas}` : ""} · ${periodo.rotulo}`}
      aoVivo={vivos.length}>
      <Recarrega segundos={15} />
      <SubAbasPedidos atual="abandonados" abandonados={total} />

      <FiltroCarrinhos de={periodo.de} ate={periodo.ate} hoje={hojeNoPainel()} etapa={etapa} />

      {erro && (
        <div className={s.aviso} role="alert">
          <p className={s.avisoTitulo}>Falha ao carregar carrinhos</p>
          <p>{erro} O painel tentará novamente automaticamente em até 15 segundos.</p>
        </div>
      )}

      <section className={`${s.cartao} ${s.cartaoTabela}`}>
        {!erro && carrinhos.length === 0 ? (
          <p className={s.vazio}>
            {total > 0
              ? "Esta página não existe mais. Volte para a primeira página."
              : "Nenhum carrinho abandonado encontrado com esses filtros. Altere a data ou a etapa em que o cliente parou."}
          </p>
        ) : carrinhos.length > 0 ? (
          <div className={s.tabelaWrap}>
            <table className={`${s.tabela} ${s.tabelaResponsiva} ${s.tabelaAbandonados}`}>
              <thead>
                <tr>
                  <th>Contato</th><th>Parou em</th><th>Produto</th>
                  <th className={s.dir}>Valor</th><th>Origem</th><th>Última atividade</th>
                </tr>
              </thead>
              <tbody>
                {carrinhos.map((c) => (
                  <tr key={c.sessao} className={s.linhaPedido}>
                    <td data-label="Contato">
                      <Link
                        href={`/ioh3j4ciof3n3oic/pedidos/abandonados/${encodeURIComponent(c.sessao)}`}
                        className={s.linkPedido}
                        aria-label={`Abrir dados do carrinho de ${c.nome ?? c.email ?? "cliente sem nome"}`}
                      >
                        {c.nome ?? "Sem nome"}
                      </Link>
                      {c.email && <><br /><span className={s.mono}>{c.email}</span></>}
                      {tel(c.telefone) && <><br /><span className={s.mono}>{tel(c.telefone)}</span></>}
                    </td>
                    <td data-label="Parou em">
                      <span className={`${s.selo} ${s.seloPendente}`}>{c.etapa}</span>
                    </td>
                    <td data-label="Produto">{c.produto_nome ?? "—"}</td>
                    <td className={s.dir} data-label="Valor">{c.valor ? <strong>{moeda(c.valor)}</strong> : "—"}</td>
                    <td data-label="Origem">
                      {[c.cidade, c.uf].filter(Boolean).join(" - ") || "—"}
                      {c.dispositivo && <><br /><span className={s.formaPgto}>
                        {rotuloDispositivo(c.dispositivo)}
                      </span></>}
                    </td>
                    <td className={s.mono} data-label="Última atividade">
                      {quando(c.atualizado_em)}<span className={s.pedidoSeta} aria-hidden="true">→</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <Paginacao pagina={pagina} total={total} porPagina={POR_PAGINA}
        base="/ioh3j4ciof3n3oic/pedidos/abandonados"
        query={{ de: periodo.de, ate: periodo.ate, etapa }} rotulo="carrinhos abandonados" />
    </Casca>
  );
}
