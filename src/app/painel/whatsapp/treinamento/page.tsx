import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Casca from "@/components/painel/Casca";
import FormTreinamento from "@/components/painel/FormTreinamento";
import { lerAoVivo } from "@/components/painel/dados";
import { lerTreinamento } from "@/lib/robo";
import { autenticado, painelConfigurado } from "@/lib/painel-auth";
import s from "@/components/painel/painel.module.css";

export const metadata: Metadata = { title: "Treinamento do robô", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Page() {
  if (!painelConfigurado()) redirect("/painel");
  if (!(await autenticado())) redirect("/painel/entrar");

  const [vivos, treinamento] = await Promise.all([lerAoVivo(), lerTreinamento()]);
  const semChave = !process.env.ANTHROPIC_API_KEY;

  return (
    <Casca atual="/painel/whatsapp" titulo="Treinamento do robô"
      subtitulo="Define como ele responde no WhatsApp" aoVivo={vivos.length}>
      <p style={{ marginBottom: 18 }}>
        <Link href="/painel/whatsapp" style={{ fontSize: 13, color: "#2f5fd0", textDecoration: "underline" }}>
          ← Voltar para as conversas
        </Link>
      </p>

      {semChave && (
        <div className={s.aviso}>
          <p className={s.avisoTitulo}>Falta a chave da Anthropic</p>
          <p>
            Defina <code>ANTHROPIC_API_KEY</code> no ambiente. Sem ela o robô não responde —
            as mensagens ficam registradas e a conversa espera atendimento humano.
          </p>
        </div>
      )}

      <FormTreinamento inicial={treinamento} />
    </Casca>
  );
}
