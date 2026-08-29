import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Casca from "@/components/painel/Casca";
import { lerAoVivo } from "@/components/painel/dados";
import { autenticado, painelConfigurado } from "@/lib/painel-auth";
import s from "@/components/painel/painel.module.css";

export const metadata: Metadata = { title: "WhatsApp", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Page() {
  if (!painelConfigurado()) redirect("/painel");
  if (!(await autenticado())) redirect("/painel/entrar");
  const vivos = await lerAoVivo();

  return (
    <Casca atual="/painel/whatsapp" titulo="WhatsApp" subtitulo="Atendimento pela Z-API" aoVivo={vivos.length}>
      <div className={s.aviso}>
        <p className={s.avisoTitulo}>Ainda não construído</p>
        <p>
          Esta tela é o lugar reservado para a caixa de conversas, os fluxos automáticos e o
          robô de atendimento. Antes dela precisam existir: as credenciais da Z-API em{" "}
          <Link href="/painel/integracoes" style={{ textDecoration: "underline" }}>Integrações</Link>,
          o webhook de mensagens recebendo em <code>/api/webhooks/zapi</code> e as tabelas de
          conversas no Supabase.
        </p>
      </div>
    </Casca>
  );
}
