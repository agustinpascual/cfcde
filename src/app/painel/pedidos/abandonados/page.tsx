import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Casca from "@/components/painel/Casca";
import Recarrega from "@/components/painel/Recarrega";
import SubAbasPedidos from "@/components/painel/SubAbasPedidos";
import { lerAoVivo, lerCarrinhosComEstado, moeda, rotuloDispositivo } from "@/components/painel/dados";
import { autenticado, painelConfigurado } from "@/lib/painel-auth";
import s from "@/components/painel/painel.module.css";

export const metadata: Metadata = { title: "Carrinhos abandonados", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

const tel = (v: string | null) => {
  if (!v) return null;
  const n = v.replace(/\D/g, "");
  return n.length >= 10 ? n.replace(/^(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3") : v;
};

export default async function Page() {
  if (!painelConfigurado()) redirect("/painel");
  if (!(await autenticado())) redirect("/painel/entrar");

  const [resultado, vivos] = await Promise.all([lerCarrinhosComEstado(), lerAoVivo()]);
  const { carrinhos, erro } = resultado;

  return (
    <Casca atual="/painel/pedidos" titulo="Pedidos"
      subtitulo={erro ? "Não foi possível consultar os carrinhos"
        : carrinhos.length === 0 ? "Nenhum carrinho abandonado"
        : `${carrinhos.length} ${carrinhos.length === 1 ? "carrinho abandonado" : "carrinhos abandonados"} · quem preencheu dados e não pagou`}
      aoVivo={vivos.length}>
      <Recarrega segundos={15} />
      <SubAbasPedidos atual="abandonados" abandonados={carrinhos.length} />

      {erro && (
        <div className={s.aviso} role="alert">
          <p className={s.avisoTitulo}>Falha ao carregar carrinhos</p>
          <p>{erro} O painel tentará novamente automaticamente em até 15 segundos.</p>
        </div>
      )}

      <section className={s.cartao}>
        {!erro && carrinhos.length === 0 ? (
          <p className={s.vazio}>
            Nenhum carrinho abandonado por aqui. Quando alguém preencher os dados
            no checkout e sair sem pagar, o contato aparece aqui para você recuperar
            a venda.
          </p>
        ) : carrinhos.length > 0 ? (
          <div className={s.tabelaWrap}>
            <table className={s.tabela}>
              <thead>
                <tr>
                  <th>Contato</th><th>Parou em</th><th>Produto</th>
                  <th className={s.dir}>Valor</th><th>Origem</th><th>Última atividade</th>
                </tr>
              </thead>
              <tbody>
                {carrinhos.map((c) => (
                  <tr key={c.sessao}>
                    <td>
                      {c.nome ?? "Sem nome"}
                      {c.email && <><br /><span className={s.mono}>{c.email}</span></>}
                      {tel(c.telefone) && <><br /><span className={s.mono}>{tel(c.telefone)}</span></>}
                    </td>
                    <td>
                      <span className={`${s.selo} ${s.seloPendente}`}>{c.etapa}</span>
                    </td>
                    <td>{c.produto_nome ?? "—"}</td>
                    <td className={s.dir}>{c.valor ? <strong>{moeda(c.valor)}</strong> : "—"}</td>
                    <td>
                      {[c.cidade, c.uf].filter(Boolean).join(" - ") || "—"}
                      {c.dispositivo && <><br /><span className={s.formaPgto}>
                        {rotuloDispositivo(c.dispositivo)}
                      </span></>}
                    </td>
                    <td className={s.mono}>{quando(c.atualizado_em)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </Casca>
  );
}
