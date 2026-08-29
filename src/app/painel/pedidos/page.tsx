import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AvisoConfig from "@/components/painel/AvisoConfig";
import Casca from "@/components/painel/Casca";
import { configurado, lerAoVivo, lerPedidos, moeda } from "@/components/painel/dados";
import { autenticado, painelConfigurado } from "@/lib/painel-auth";
import s from "@/components/painel/painel.module.css";

export const metadata: Metadata = { title: "Pedidos", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const SELO: Record<string, string> = {
  aprovado: s.seloAprovado, pendente: s.seloPendente,
  falhou: s.seloFalhou, expirado: s.seloFalhou, estornado: s.seloNeutro,
};
const ROTULO: Record<string, string> = {
  aprovado: "Pago", pendente: "Aguardando", falhou: "Falhou",
  expirado: "Expirado", estornado: "Estornado",
};
const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
  });

export default async function Page() {
  if (!painelConfigurado()) redirect("/painel");
  if (!(await autenticado())) redirect("/painel/entrar");

  const [pedidos, vivos] = await Promise.all([lerPedidos(100), lerAoVivo()]);

  return (
    <Casca atual="/painel/pedidos" titulo="Pedidos"
      subtitulo={`${pedidos.length} mais recentes · clique para ver os detalhes`} aoVivo={vivos.length}>
      <AvisoConfig faltando={configurado() ? [] : ["SUPABASE_SERVICE_ROLE_KEY"]} />

      <section className={s.cartao}>
        {pedidos.length === 0 ? (
          <p className={s.vazio}>
            Nenhum pedido ainda. Assim que alguém gerar um PIX no checkout, ele aparece aqui —
            e muda para “Pago” quando o webhook da PinPay confirmar.
          </p>
        ) : (
          <div className={s.tabelaWrap}>
            <table className={s.tabela}>
              <thead>
                <tr>
                  <th>Pedido</th><th>Cliente</th><th>Status</th>
                  <th className={s.dir}>Valor</th><th>Data</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => (
                  <tr key={p.id}>
                    <td className={s.mono}>
                      <Link href={`/painel/pedidos/${p.id}`} className={s.linkPedido}>{p.referencia}</Link>
                    </td>
                    <td>
                      {p.cliente_nome ?? "—"}
                      {p.cliente_email && <><br /><span className={s.mono}>{p.cliente_email}</span></>}
                    </td>
                    <td>
                      <span className={`${s.selo} ${SELO[p.status] ?? s.seloNeutro}`}>
                        {ROTULO[p.status] ?? p.status}
                      </span>
                      <span className={s.formaPgto}>PIX</span>
                    </td>
                    <td className={s.dir}><strong>{moeda(p.valor_centavos)}</strong></td>
                    <td className={s.mono}>{quando(p.criado_em)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Casca>
  );
}
