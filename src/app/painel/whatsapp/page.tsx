import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Casca from "@/components/painel/Casca";
import Conversas, { type Conversa } from "@/components/painel/Conversas";
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

      <Conversas inicial={conversas} />

    </Casca>
  );
}
