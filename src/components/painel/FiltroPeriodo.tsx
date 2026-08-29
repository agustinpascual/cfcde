"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import f from "./filtro.module.css";

const ATALHOS = [
  { id: "hoje", rotulo: "Hoje" },
  { id: "7d", rotulo: "7 dias" },
  { id: "30d", rotulo: "30 dias" },
  { id: "90d", rotulo: "90 dias" },
];

/* Filtros ficam numa linha só, acima dos gráficos. */
export default function FiltroPeriodo({ de, ate }: { de: string; ate: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const busca = useSearchParams();
  const atual = busca.get("periodo") ?? (busca.get("de") ? "" : "30d");

  const [inicio, setInicio] = useState(de);
  const [fim, setFim] = useState(ate);
  const [aberto, setAberto] = useState(false);

  const irPara = (qs: string) => router.push(`${pathname}${qs}`, { scroll: false });

  return (
    <div className={f.barra}>
      <div className={f.atalhos} role="group" aria-label="Período">
        {ATALHOS.map((a) => (
          <button key={a.id} type="button"
            className={`${f.atalho} ${atual === a.id ? f.atalhoAtivo : ""}`}
            aria-pressed={atual === a.id}
            onClick={() => { setAberto(false); irPara(`?periodo=${a.id}`); }}>
            {a.rotulo}
          </button>
        ))}
        <button type="button" className={`${f.atalho} ${!atual ? f.atalhoAtivo : ""}`}
          aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
          Escolher datas
        </button>
      </div>

      {aberto && (
        <form className={f.intervalo}
          onSubmit={(e) => { e.preventDefault(); setAberto(false); irPara(`?de=${inicio}&ate=${fim}`); }}>
          <label className={f.rotulo}>De
            <input type="date" className={f.data} value={inicio} max={fim} onChange={(e) => setInicio(e.target.value)} />
          </label>
          <label className={f.rotulo}>Até
            <input type="date" className={f.data} value={fim} min={inicio}
              max={new Date().toISOString().slice(0, 10)} onChange={(e) => setFim(e.target.value)} />
          </label>
          <button type="submit" className={f.aplicar}>Aplicar</button>
        </form>
      )}

      <span className={f.resumo}>{de.split("-").reverse().join("/")} → {ate.split("-").reverse().join("/")}</span>
    </div>
  );
}
