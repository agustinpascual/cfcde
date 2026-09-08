import { Monitor, Smartphone, Tablet, HelpCircle } from "lucide-react";
import type { Periodo, Sessao } from "./dados";
import { supabaseAdmin } from "@/lib/supabase/servidor";
import { contarDispositivos, TIPOS_DISPOSITIVOS, type GrupoDispositivo } from "@/lib/dispositivos";
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
    const [total, ...tipos] = await Promise.all([
      consulta(),
      ...TIPOS_DISPOSITIVOS.map((tipo) => consulta().eq("dispositivo", tipo.id)),
    ]);
    for (const resultado of [total, ...tipos]) {
      if (resultado.error) throw new Error(resultado.error.message);
      if (resultado.count === null) throw new Error("Contagem indisponível");
    }
    const contagens: Record<GrupoDispositivo, number> = { celular: 0, computador: 0, tablet: 0, outros: 0 };
    const detalhes = TIPOS_DISPOSITIVOS.map((tipo, i) => {
      const quantidade = tipos[i].count ?? 0;
      contagens[tipo.grupo] += quantidade;
      return { ...tipo, quantidade };
    });
    contagens.outros = Math.max(0, (total.count ?? 0) - contagens.celular - contagens.computador - contagens.tablet);
    return { total: total.count ?? 0, contagens, detalhes };
  } catch (erro) {
    console.error("[painel] acessos_dispositivos:", (erro as Error).message);
    return null;
  }
}

const categorias = [
  { id: "celular", titulo: "Celulares", Icone: Smartphone },
  { id: "computador", titulo: "Computadores", Icone: Monitor },
  { id: "tablet", titulo: "Tablets", Icone: Tablet },
  { id: "outros", titulo: "Não identificado", Icone: HelpCircle },
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
        {categorias.map(({ id, titulo, Icone }) => {
          const quantidade = resumo?.contagens[id];
          const percentual = resumo && resumo.total > 0 ? ((quantidade ?? 0) / resumo.total) * 100 : 0;
          return (
            <article key={id} className={s.item}>
              <div className={s.rotulo}><Icone size={19} aria-hidden /><h3>{titulo}</h3></div>
              <div className={s.valor}><strong>{quantidade === undefined ? "—" : numero(quantidade)}</strong><span>{resumo ? `${percentual.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—"}</span></div>
              {id === "outros" ? <p className={s.detalhe}>Dispositivo não informado ou não reconhecido.</p> : (
                <dl className={s.tipos}>
                  {TIPOS_DISPOSITIVOS.filter((tipo) => tipo.grupo === id).map((tipo) => (
                    <div key={tipo.id}>
                      <dt>{tipo.rotulo}</dt>
                      <dd>{resumo ? numero(resumo.detalhes.find((item) => item.id === tipo.id)?.quantidade ?? 0) : "—"}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <p className={s.online}><i aria-hidden />{numero(vivos[id])} online agora</p>
            </article>
          );
        })}
      </div>
      <p className={s.nota}>As quantidades representam sessões, não aparelhos únicos. O mesmo aparelho pode iniciar mais de uma sessão. Registros antigos sem sistema informado aparecem como “não especificado”.</p>
    </section>
  );
}
