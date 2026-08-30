import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Casca from "@/components/painel/Casca";
import FaixaInstalar from "@/components/painel/FaixaInstalar";
import MapaBrasil from "@/components/painel/MapaBrasil";
import Recarrega from "@/components/painel/Recarrega";
import { estadoInstalacao, lerAoVivo } from "@/components/painel/dados";
import { autenticado, painelConfigurado } from "@/lib/painel-auth";
import s from "@/components/painel/painel.module.css";

export const metadata: Metadata = { title: "Ao vivo", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const NOME_PAGINA: Record<string, string> = {
  "/": "Página do produto",
  "/checkout": "Checkout",
  "/contato": "Contato",
  "/sobre": "Sobre nós",
  "/duvidas-frequentes": "Dúvidas frequentes",
  "/politica-de-privacidade": "Política de privacidade",
};
const nomear = (p: string | null) =>
  !p ? "—" : p.startsWith("/pagamento") ? "Tela de pagamento" : NOME_PAGINA[p] ?? p;

const tempo = (seg: number) =>
  seg < 60 ? `${seg}s` : seg < 3600 ? `${Math.floor(seg / 60)}min` : `${Math.floor(seg / 3600)}h`;

export default async function Page() {
  if (!painelConfigurado()) redirect("/painel");
  if (!(await autenticado())) redirect("/painel/entrar");

  const vivos = await lerAoVivo();
  const noCheckout = vivos.filter((v) => v.pagina?.startsWith("/checkout")).length;
  const noPagamento = vivos.filter((v) => v.pagina?.startsWith("/pagamento")).length;
  const copiaram = vivos.filter((v) => v.copiou_pix).length;

  const _inst = await estadoInstalacao();

  const _faltam = _inst?.filter((t) => !t.existe || t.colunasFaltando.length).length ?? 0;


  return (
    <Casca atual="/painel/ao-vivo" titulo="Ao vivo" subtitulo="Atualiza sozinho a cada 15 segundos" aoVivo={vivos.length}>
      <FaixaInstalar faltam={_faltam} />
      <Recarrega segundos={15} />

      <div className={s.kpis}>
        <Kpi rotulo="Online agora" valor={String(vivos.length)} nota="ping nos últimos 60s" vivo />
        <Kpi rotulo="No checkout" valor={String(noCheckout)} nota="preenchendo os dados" />
        <Kpi rotulo="Na tela do PIX" valor={String(noPagamento)} nota="cobrança gerada" />
        <Kpi rotulo="Copiaram o PIX" valor={String(copiaram)} nota="prestes a pagar" />
      </div>

      <div className={s.grade}>
        <section className={s.cartao}>
          <h2 className={s.cartaoTitulo}>Onde estão</h2>
          <p className={s.cartaoSub}>Posição aproximada pelo IP</p>
          <MapaBrasil sessoes={vivos} />
        </section>

        <section className={s.cartao}>
          <h2 className={s.cartaoTitulo}>Sessões ativas</h2>
          <p className={s.cartaoSub}>{vivos.length} pessoa{vivos.length === 1 ? "" : "s"} no site</p>
          {vivos.length === 0 ? (
            <p className={s.vazio}>Ninguém no site agora.</p>
          ) : (
            <div className={s.tabelaWrap}>
              <table className={s.tabela}>
                <thead>
                  <tr><th>Local</th><th>Página</th><th>Bloco</th><th>Tempo</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {vivos.slice(0, 40).map((v) => (
                    <tr key={v.sessao}>
                      <td>{v.cidade ? `${v.cidade}${v.uf ? `/${v.uf}` : ""}` : "—"}</td>
                      <td>{nomear(v.pagina)}</td>
                      <td className={s.mono}>{v.secao ?? "—"}</td>
                      <td>{tempo(v.segundos_no_site)}</td>
                      <td>
                        {v.copiou_pix
                          ? <span className={`${s.selo} ${s.seloAprovado}`}>Copiou o PIX</span>
                          : v.pagina?.startsWith("/pagamento")
                            ? <span className={`${s.selo} ${s.seloPendente}`}>Na tela do PIX</span>
                            : v.pagina?.startsWith("/checkout")
                              ? <span className={`${s.selo} ${s.seloPendente}`}>No checkout</span>
                              : <span className={`${s.selo} ${s.seloNeutro}`}>Navegando</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
