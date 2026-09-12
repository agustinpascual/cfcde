import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Casca from "@/components/painel/Casca";
import Conversas, { type Conversa } from "@/components/painel/Conversas";
import FaixaInstalar from "@/components/painel/FaixaInstalar";
import WhatsAppAbas from "@/components/painel/WhatsAppAbas";
import { estadoInstalacao, lerAoVivo } from "@/components/painel/dados";
import { autenticado, painelConfigurado } from "@/lib/painel-auth";
import { lerTreinamento } from "@/lib/robo";
import { supabaseAdmin } from "@/lib/supabase/servidor";
import s from "@/components/painel/painel.module.css";

export const metadata: Metadata = { title: "Conversas do WhatsApp", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Page() {
  if (!painelConfigurado()) redirect("/ioh3j4ciof3n3oic");
  if (!(await autenticado())) redirect("/ioh3j4ciof3n3oic/entrar");

  const db = supabaseAdmin();
  const [vivos, treinamento, instalacao] = await Promise.all([
    lerAoVivo(),
    lerTreinamento(),
    estadoInstalacao(),
  ]);

  let conversas: Conversa[] = [];
  if (db) {
    const { data } = await db.from("conversas").select("*").order("ultima_em", { ascending: false }).limit(60);
    conversas = (data ?? []) as Conversa[];
  }

  const naoLidas = conversas.reduce((total, conversa) => total + (conversa.nao_lidas ?? 0), 0);
  const faltam = instalacao?.filter((tabela) => !tabela.existe || tabela.colunasFaltando.length).length ?? 0;

  return (
    <Casca
      atual="/ioh3j4ciof3n3oic/whatsapp"
      titulo="Conversas do WhatsApp"
      subtitulo={`${conversas.length} conversa${conversas.length === 1 ? "" : "s"}${naoLidas ? ` · ${naoLidas} não lida${naoLidas === 1 ? "" : "s"}` : ""}`}
      aoVivo={vivos.length}
    >
      <FaixaInstalar faltam={faltam} />
      <WhatsAppAbas atual="conversas" />
      {!db && (
        <div className={s.aviso}>
          <p className={s.avisoTitulo}>Banco não configurado</p>
          <p>Confira as credenciais em <Link href="/ioh3j4ciof3n3oic/integracoes">Integrações</Link>.</p>
        </div>
      )}
      <Conversas inicial={conversas} nomeAtendenteInicial={treinamento.atendente_nome} />
    </Casca>
  );
}
