import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Casca from "@/components/painel/Casca";
import Instalador from "@/components/painel/Instalador";
import Recarrega from "@/components/painel/Recarrega";
import { estadoInstalacao } from "@/components/painel/dados";
import { autenticado, painelConfigurado } from "@/lib/painel-auth";
import { SQL_INSTALACAO } from "@/lib/sql-instalacao";
import s from "@/components/painel/painel.module.css";

export const metadata: Metadata = { title: "Instalação", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Monta o link do SQL Editor a partir da URL do projeto, sem expor a chave. */
function linkEditor(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const ref = url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1];
  return ref ? `https://supabase.com/dashboard/project/${ref}/sql/new` : "https://supabase.com/dashboard";
}

export default async function Page() {
  if (!painelConfigurado()) redirect("/painel");
  if (!(await autenticado())) redirect("/painel/entrar");

  const estado = await estadoInstalacao();
  const faltam = estado?.filter((t) => !t.existe) ?? [];
  const pronto = Boolean(estado) && faltam.length === 0;

  return (
    <Casca atual="/painel/instalar" titulo="Instalação do banco">
      {!estado ? (
        <div className={s.aviso}>
          <p className={s.avisoTitulo}>Supabase não configurado</p>
          <p>Falta <code>SUPABASE_SERVICE_ROLE_KEY</code> nas variáveis de ambiente.</p>
        </div>
      ) : pronto ? (
        <div className={s.avisoOk}>
          <p className={s.avisoTitulo}>Tudo instalado</p>
          <p>As {estado.length} tabelas existem. Pedidos, mapa ao vivo e funil já podem gravar.</p>
        </div>
      ) : (
        <div className={s.aviso}>
          <p className={s.avisoTitulo}>
            {faltam.length === estado.length
              ? "O banco está vazio — nenhuma tabela foi criada ainda"
              : `Faltam ${faltam.length} de ${estado.length} tabelas`}
          </p>
          <p>
            É por isso que Pedidos, mapa ao vivo e funil aparecem zerados: o site tenta
            gravar e o banco responde que a tabela não existe. Copie o SQL abaixo, cole no
            SQL Editor do Supabase e clique em Run. Leva uns 10 segundos e pode rodar
            de novo sem problema — é tudo <code>if not exists</code>.
          </p>
        </div>
      )}

      <ul className={s.listaTabelas}>
        {(estado ?? []).map((t) => (
          <li key={t.nome} className={t.existe ? s.tabelaOk : s.tabelaFalta}>
            <span className={s.tabelaMarca} aria-hidden>{t.existe ? "✓" : "•"}</span>
            <code>{t.nome}</code>
            <span className={s.tabelaPara}>{t.para}</span>
            <span className={s.tabelaEstado}>{t.existe ? "criada" : "faltando"}</span>
          </li>
        ))}
      </ul>

      {!pronto && estado && (
        <>
          <Instalador sql={SQL_INSTALACAO} editor={linkEditor()} />
          <p className={s.instalarNota}>
            Depois de rodar, volte aqui — esta página confere de novo a cada 15 segundos.
          </p>
          <Recarrega segundos={15} />
        </>
      )}
    </Casca>
  );
}
