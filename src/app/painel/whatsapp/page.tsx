import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Casca from "@/components/painel/Casca";
import FaixaInstalar from "@/components/painel/FaixaInstalar";
import { estadoInstalacao, lerAoVivo } from "@/components/painel/dados";
import { lerTreinamento } from "@/lib/robo";
import { ler } from "@/lib/config-integracoes";
import { supabaseAdmin } from "@/lib/supabase/servidor";
import { autenticado, painelConfigurado } from "@/lib/painel-auth";
import s from "@/components/painel/painel.module.css";
import w from "@/components/painel/whatsapp.module.css";

export const metadata: Metadata = { title: "WhatsApp", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Conversa = {
  id: string; telefone: string; nome: string | null; status: string;
  robo_ativo: boolean; ultima_msg: string | null; ultima_em: string; nao_lidas: number;
};

const quando = (iso: string) => {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  if (min < 1440) return `${Math.floor(min / 60)}h`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};
const formataTel = (t: string) =>
  t.length >= 12 ? `(${t.slice(2, 4)}) ${t.slice(4, 9)}-${t.slice(9)}` : t;

export default async function Page() {
  if (!painelConfigurado()) redirect("/painel");
  if (!(await autenticado())) redirect("/painel/entrar");

  const db = supabaseAdmin();
  const [vivos, treinamento, instancia] = await Promise.all([
    lerAoVivo(), lerTreinamento(), ler("ZAPI_INSTANCIA"),
  ]);

  let conversas: Conversa[] = [];
  if (db) {
    const { data } = await db.from("conversas").select("*").order("ultima_em", { ascending: false }).limit(60);
    conversas = (data ?? []) as Conversa[];
  }

  const naoLidas = conversas.reduce((a, c) => a + (c.nao_lidas ?? 0), 0);

  const _inst = await estadoInstalacao();

  const _faltam = _inst?.filter((t) => !t.existe).length ?? 0;


  return (
    <Casca atual="/painel/whatsapp" titulo="WhatsApp"
      subtitulo={`${conversas.length} conversa${conversas.length === 1 ? "" : "s"}${naoLidas ? ` · ${naoLidas} não lida${naoLidas === 1 ? "" : "s"}` : ""}`}
      aoVivo={vivos.length}>
      <FaixaInstalar faltam={_faltam} />

      <div className={w.barra}>
        <span className={`${w.estado} ${treinamento.ativo ? w.estadoOn : w.estadoOff}`}>
          Robô {treinamento.ativo ? "ativo" : "desligado"}
        </span>
        <span className={`${w.estado} ${instancia ? w.estadoOn : w.estadoOff}`}>
          Z-API {instancia ? "conectada" : "não configurada"}
        </span>
        <Link href="/painel/whatsapp/treinamento" className={w.btnTreinar}>Treinar o robô</Link>
      </div>

      {!instancia && (
        <div className={s.aviso}>
          <p className={s.avisoTitulo}>Z-API não configurada</p>
          <p>
            Preencha as credenciais em <Link href="/painel/integracoes" style={{ textDecoration: "underline" }}>Integrações</Link>{" "}
            e aponte o webhook de mensagens recebidas para{" "}
            <code>https://bella-gummy.vercel.app/api/webhooks/zapi</code>.
          </p>
        </div>
      )}

      <section className={s.cartao}>
        {conversas.length === 0 ? (
          <p className={s.vazio}>
            Nenhuma conversa ainda. Elas aparecem aqui assim que a Z-API entregar a primeira mensagem.
          </p>
        ) : (
          <ul className={w.lista}>
            {conversas.map((c) => (
              <li key={c.id} className={w.item}>
                <span className={w.avatar} aria-hidden>
                  {(c.nome ?? c.telefone).trim().charAt(0).toUpperCase()}
                </span>
                <span className={w.corpo}>
                  <span className={w.linhaTopo}>
                    <strong className={w.nome}>{c.nome || formataTel(c.telefone)}</strong>
                    <span className={w.hora}>{quando(c.ultima_em)}</span>
                  </span>
                  <span className={w.previa}>{c.ultima_msg ?? "—"}</span>
                </span>
                <span className={w.marcas}>
                  {c.nao_lidas > 0 && <span className={w.naoLidas}>{c.nao_lidas}</span>}
                  {!c.robo_ativo && <span className={w.humano}>humano</span>}
                  {c.status === "pendente" && <span className={w.pendente}>pendente</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Casca>
  );
}
