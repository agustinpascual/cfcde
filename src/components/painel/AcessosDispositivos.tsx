import { Monitor, Smartphone, Tablet, HelpCircle } from "lucide-react";
import type { Periodo, Sessao } from "./dados";
import { supabaseAdmin } from "@/lib/supabase/servidor";
import { contarDispositivos, GRUPOS_DISPOSITIVOS, type GrupoDispositivo } from "@/lib/dispositivos";
import s from "./acessos-dispositivos.module.css";

async function lerContagens(periodo: Periodo) {
  const db = supabaseAdmin();
  if (!db) return null;
  const consulta = () => db.from("sessoes").select("sessao", { count: "exact", head: true })
    .gte("criado_em", `${periodo.de}T00:00:00-03:00`)
    .lte("criado_em", `${periodo.ate}T23:59:59.999-03:00`)
    .or("pagina.is.null,pagina.not.like./painel%");

  try {
    // COUNT no banco evita o limite de 1.000 linhas das consultas de dados.
    const [total, ...grupos] = await Promise.all([
      consulta(),
      ...GRUPOS_DISPOSITIVOS.map((grupo) => consulta().in("dispositivo", grupo.valores)),
    ]);
    for (const resultado of [total, ...grupos]) {
      if (resultado.error) throw new Error(resultado.error.message);
      if (resultado.count === null) throw new Error("Contagem indisponível");
    }
    const contagens: Record<GrupoDispositivo, number> = { celular: 0, computador: 0, tablet: 0, outros: 0 };
    GRUPOS_DISPOSITIVOS.forEach((grupo, i) => { contagens[grupo.id] = grupos[i].count ?? 0; });
    contagens.outros = Math.max(0, (total.count ?? 0) - contagens.celular - contagens.computador - contagens.tablet);
    return { total: total.count ?? 0, contagens };
  } catch (erro) {
    console.error("[painel] acessos_dispositivos:", (erro as Error).message);
    return null;
  }
}

const categorias = [
  { id: "celular", titulo: "Celulares", detalhe: "iPhone, Android e outros", Icone: Smartphone },
  { id: "computador", titulo: "Computadores", detalhe: "Windows, Mac e Linux", Icone: Monitor },
  { id: "tablet", titulo: "Tablets", detalhe: "iPad, Android e outros", Icone: Tablet },
  { id: "outros", titulo: "Não identificado", detalhe: "Dispositivo não informado", Icone: HelpCircle },
] as const;
const numero = (valor: number) => valor.toLocaleString("pt-BR");

export default async function AcessosDispositivos({ periodo, online }: { periodo: Periodo; online: Sessao[] }) {
  const resumo = await lerContagens(periodo);
  const vivos = contarDispositivos(online);

  return (
    <section className={s.bloco} aria-labelledby="titulo-acessos-dispositivos">
      <div className={s.cabecalho}>
        <div>
          <h2 id="titulo-acessos-dispositivos">Acessos por dispositivo</h2>
          <p>{periodo.rotulo} · sessões iniciadas no período, sem contar recargas</p>
        </div>
        <span className={s.total}>{resumo ? `${numero(resumo.total)} sessões` : "Dados indisponíveis"}</span>
      </div>
      {!resumo && <p className={s.aviso} role="status">Não foi possível carregar os acessos do período. Tente atualizar a página.</p>}
      {resumo?.total === 0 && <p className={s.aviso}>Nenhuma sessão iniciada neste período.</p>}
      <div className={s.grade}>
        {categorias.map(({ id, titulo, detalhe, Icone }) => {
          const quantidade = resumo?.contagens[id];
          const percentual = resumo && resumo.total > 0 ? ((quantidade ?? 0) / resumo.total) * 100 : 0;
          return (
            <article key={id} className={s.item}>
              <div className={s.rotulo}><Icone size={19} aria-hidden /><h3>{titulo}</h3></div>
              <div className={s.valor}><strong>{quantidade === undefined ? "—" : numero(quantidade)}</strong><span>{resumo ? `${percentual.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—"}</span></div>
              <p className={s.detalhe}>{detalhe}</p>
              <p className={s.online}><i aria-hidden />{numero(vivos[id])} online agora</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
