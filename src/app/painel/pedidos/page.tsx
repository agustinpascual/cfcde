import type { Metadata } from "next";
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
const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function Page() {
  if (!painelConfigurado()) redirect("/painel");
  if (!(await autenticado())) redirect("/painel/entrar");

  const [pedidos, vivos] = await Promise.all([lerPedidos(100), lerAoVivo()]);

  return (
    <Casca atual="/painel/pedidos" titulo="Pedidos" subtitulo={`${pedidos.length} mais recentes`} aoVivo={vivos.length}>
      <AvisoConfig faltando={configurado() ? [] : ["SUPABASE_SERVICE_ROLE_KEY"]} />

      <section className={s.cartao}>
        {pedidos.length === 0 ? (
          <p className={s.vazio}>
            Nenhum pedido ainda. Eles aparecem aqui assim que o webhook da PinPay gravar a primeira cobrança.
          </p>
        ) : (
          <div className={s.tabelaWrap}>
            <table className={s.tabela}>
              <thead>
                <tr>
                  <th>Pedido</th><th>Cliente</th><th>Kit</th>
                  <th className={s.dir}>Valor</th><th>Status</th><th>Criado</th><th>Pago</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => (
                  <tr key={p.id}>
                    <td className={s.mono}>{p.referencia}</td>
                    <td>
                      {p.cliente_nome ?? "—"}
                      {p.cliente_email && <><br /><span className={s.mono}>{p.cliente_email}</span></>}
                    </td>
                    <td>{p.kit ?? "—"}{p.quantidade > 1 && ` ×${p.quantidade}`}</td>
                    <td className={s.dir}><strong>{moeda(p.valor_centavos)}</strong></td>
                    <td><span className={`${s.selo} ${SELO[p.status] ?? s.seloNeutro}`}>{p.status}</span></td>
                    <td>{quando(p.criado_em)}</td>
                    <td>{p.pago_em ? quando(p.pago_em) : "—"}</td>
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
