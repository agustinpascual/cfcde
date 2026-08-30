import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Casca from "@/components/painel/Casca";
import Emails from "@/components/painel/Emails";
import FaixaInstalar from "@/components/painel/FaixaInstalar";
import { estadoInstalacao, lerAoVivo } from "@/components/painel/dados";
import { ler } from "@/lib/config-integracoes";
import { autenticado, painelConfigurado } from "@/lib/painel-auth";
import s from "@/components/painel/painel.module.css";

export const metadata: Metadata = { title: "E-mails", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Page() {
  if (!painelConfigurado()) redirect("/painel");
  if (!(await autenticado())) redirect("/painel/entrar");

  const [vivos, _inst, chave, remetente] = await Promise.all([
    lerAoVivo(), estadoInstalacao(), ler("RESEND_API_KEY"), ler("RESEND_REMETENTE"),
  ]);
  const _faltam = _inst?.filter((t) => !t.existe || t.colunasFaltando.length).length ?? 0;
  const pronta = Boolean(chave && remetente);

  return (
    <Casca atual="/painel/emails" titulo="E-mails"
      subtitulo="Importe a lista, escreva a mensagem e dispare" aoVivo={vivos.length}>
      <FaixaInstalar faltam={_faltam} />

      {!pronta && (
        <div className={s.aviso}>
          <p className={s.avisoTitulo}>Resend não configurada</p>
          <p>
            Preencha <code>RESEND_API_KEY</code> e <code>RESEND_REMETENTE</code> em{" "}
            <Link href="/painel/integracoes" style={{ textDecoration: "underline" }}>Integrações</Link>.
            O remetente precisa ser de um domínio verificado com SPF e DKIM na Resend —
            sem isso o disparo cai em spam ou é recusado.
          </p>
        </div>
      )}

      <Emails />
    </Casca>
  );
}
