"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import f from "./filtro.module.css";

const ATALHOS = [
  { id: "hoje", rotulo: "Hoje" },
  { id: "7d", rotulo: "7 dias" },
  { id: "30d", rotulo: "30 dias" },
  { id: "90d", rotulo: "90 dias" },
];

type Modo = "dia" | "intervalo" | null;

/* Atalhos, dia exato e intervalo convivem sem alterar os demais filtros. */
export default function FiltroPeriodo({ de, ate, hoje }: { de: string; ate: string; hoje: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const busca = useSearchParams();
  const atual = busca.get("periodo") ?? (busca.get("de") ? "" : "hoje");
  const personalizado = Boolean(busca.get("de") && busca.get("ate"));
  const diaAtivo = personalizado && de === ate;

  const [inicio, setInicio] = useState(de);
  const [fim, setFim] = useState(ate);
  const [dia, setDia] = useState(de === ate ? de : ate);
  const [modo, setModo] = useState<Modo>(null);
  const seletor = useRef<HTMLDetailsElement>(null);
  const formatar = (data: string) => data.split("-").reverse().join("/");
  const rotulo = de === hoje && ate === hoje ? "Hoje"
    : personalizado ? (de === ate ? formatar(de) : `${formatar(de)} – ${formatar(ate)}`)
    : ATALHOS.find((a) => a.id === atual)?.rotulo ?? "Hoje";

  useEffect(() => {
    const fecharFora = (evento: PointerEvent) => {
      if (evento.target instanceof Node && !seletor.current?.contains(evento.target) && seletor.current) {
        seletor.current.open = false;
      }
    };
    document.addEventListener("pointerdown", fecharFora);
    return () => document.removeEventListener("pointerdown", fecharFora);
  }, []);

  const irPara = (qs: string) => {
    const parametros = new URLSearchParams(busca.toString());
    ["periodo", "de", "ate"].forEach((chave) => parametros.delete(chave));
    new URLSearchParams(qs).forEach((valor, chave) => parametros.set(chave, valor));
    if (seletor.current) {
      seletor.current.open = false;
      seletor.current.querySelector("summary")?.focus();
    }
    router.push(`${pathname}?${parametros}`, { scroll: false });
  };
  const abrir = (novo: Exclude<Modo, null>) => setModo((atual) => atual === novo ? null : novo);

  return (
    <div className={f.barra}>
      <details ref={seletor} className={f.seletorPeriodo}
        onToggle={(e) => {
          if (e.currentTarget.open) {
            setInicio(de); setFim(ate); setDia(de === ate ? de : ate); setModo(null);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.currentTarget.open = false;
            e.currentTarget.querySelector("summary")?.focus();
          }
        }}>
        <summary className={f.gatilhoPeriodo} aria-label={`Escolher período: ${rotulo}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" />
          </svg>
          <span>{rotulo}</span><span className={f.setaPeriodo} aria-hidden="true">⌄</span>
        </summary>
        <div className={f.opcoesPeriodo}>
          <p className={f.tituloPeriodo}>Selecionar período</p>
      <div className={f.atalhos} role="group" aria-label="Período">
        {ATALHOS.map((a) => (
          <button key={a.id} type="button"
            className={`${f.atalho} ${atual === a.id ? f.atalhoAtivo : ""}`}
            aria-pressed={atual === a.id}
            onClick={() => { setModo(null); irPara(`?periodo=${a.id}`); }}>
            {a.rotulo}
          </button>
        ))}
        <button type="button" className={`${f.atalho} ${diaAtivo ? f.atalhoAtivo : ""}`}
          aria-expanded={modo === "dia"} onClick={() => abrir("dia")}>
          Escolher dia
        </button>
        <button type="button" className={`${f.atalho} ${personalizado && !diaAtivo ? f.atalhoAtivo : ""}`}
          aria-expanded={modo === "intervalo"} onClick={() => abrir("intervalo")}>
          Intervalo
        </button>
      </div>

      {modo === "dia" && (
        <form className={f.intervalo}
          onSubmit={(e) => { e.preventDefault(); if (dia) { setModo(null); irPara(`?de=${dia}&ate=${dia}`); } }}>
          <label className={f.rotulo}>Dia
            <input type="date" className={f.data} value={dia} max={hoje}
              onChange={(e) => setDia(e.target.value)} required />
          </label>
          <button type="submit" className={f.aplicar}>Aplicar dia</button>
        </form>
      )}

      {modo === "intervalo" && (
        <form className={f.intervalo}
          onSubmit={(e) => {
            e.preventDefault();
            if (inicio && fim && inicio <= fim) { setModo(null); irPara(`?de=${inicio}&ate=${fim}`); }
          }}>
          <label className={f.rotulo}>De
            <input type="date" className={f.data} value={inicio} max={fim < hoje ? fim : hoje}
              onChange={(e) => setInicio(e.target.value)} required />
          </label>
          <label className={f.rotulo}>Até
            <input type="date" className={f.data} value={fim} min={inicio}
              max={hoje} onChange={(e) => setFim(e.target.value)} required />
          </label>
          <button type="submit" className={f.aplicar}>Aplicar</button>
        </form>
      )}

          <p className={f.notaPeriodo}>Período atual: {formatar(de)} → {formatar(ate)}<br />Horário de Brasília</p>
        </div>
      </details>
    </div>
  );
}
