"use client";
import { useId, useState } from "react";
import g from "./grafico.module.css";

/* Gráficos em SVG puro — sem biblioteca.
   Paleta validada pelo validate_palette.js (light, superfície #fff):
   #2f5fd0 · #1d9a8a · #c2410c — passa nos seis testes, inclusive
   separação para daltonismo e contraste contra o fundo. */
export const CORES = ["#2f5fd0", "#1d9a8a", "#c2410c"] as const;
const TINTA2 = "#64748b", GRADE = "#eceff3";

/* ---------- área + linha: receita por dia ---------- */
export type Formato = "moeda" | "numero";

/* O formatador vive aqui dentro: função não atravessa a fronteira
   servidor → cliente, só dado serializável. */
const FORMATA: Record<Formato, (v: number) => string> = {
  moeda: (v) => `R$${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`,
  numero: (v) => v.toLocaleString("pt-BR"),
};

export function AreaTempo({ dados, formato = "moeda" }: {
  dados: { rotulo: string; valor: number }[];
  formato?: Formato;
}) {
  const formatar = FORMATA[formato];
  const id = useId();
  const [ativo, setAtivo] = useState<number | null>(null);
  if (dados.length < 2) return <p className={g.vazio}>Sem dados suficientes ainda.</p>;

  const L = 52, R = 14, T = 14, B = 26, W = 720, H = 240;
  const max = Math.max(...dados.map((d) => d.valor), 1);
  const px = (i: number) => L + (i * (W - L - R)) / (dados.length - 1);
  const py = (v: number) => T + (H - T - B) * (1 - v / max);

  const linha = dados.map((d, i) => `${i ? "L" : "M"}${px(i)},${py(d.valor)}`).join(" ");
  const area = `${linha} L${px(dados.length - 1)},${H - B} L${L},${H - B} Z`;
  const marcas = [0, 0.5, 1].map((f) => Math.round(max * f));

  return (
    <div className={g.wrap}>
      <svg viewBox={`0 0 ${W} ${H}`} className={g.svg} role="img"
        aria-label={`Receita por dia, ${dados.length} dias, máximo ${formatar(max)}`}
        onMouseLeave={() => setAtivo(null)}>
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CORES[0]} stopOpacity="0.16" />
            <stop offset="100%" stopColor={CORES[0]} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* grade recessiva */}
        {marcas.map((m, i) => (
          <g key={i}>
            <line x1={L} x2={W - R} y1={py(m)} y2={py(m)} stroke={GRADE} strokeWidth="1" />
            <text x={L - 8} y={py(m) + 4} textAnchor="end" className={g.eixo}>{formatar(m)}</text>
          </g>
        ))}

        <path d={area} fill={`url(#${id}-fill)`} />
        <path d={linha} fill="none" stroke={CORES[0]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* rótulos do eixo x: primeiro, meio e último */}
        {[0, Math.floor(dados.length / 2), dados.length - 1].map((i) => (
          <text key={i} x={px(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === dados.length - 1 ? "end" : "middle"} className={g.eixo}>
            {dados[i].rotulo}
          </text>
        ))}

        {/* alvos de hover maiores que a marca */}
        {dados.map((d, i) => (
          <rect key={i} x={px(i) - (W - L - R) / dados.length / 2} y={T}
            width={(W - L - R) / dados.length} height={H - T - B} fill="transparent"
            onMouseEnter={() => setAtivo(i)} />
        ))}

        {ativo !== null && (
          <g>
            <line x1={px(ativo)} x2={px(ativo)} y1={T} y2={H - B} stroke={TINTA2} strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={px(ativo)} cy={py(dados[ativo].valor)} r="5" fill={CORES[0]} stroke="#fff" strokeWidth="2" />
          </g>
        )}
      </svg>

      {ativo !== null && (
        <div className={g.dica} style={{ left: `${(px(ativo) / W) * 100}%` }}>
          <strong>{formatar(dados[ativo].valor)}</strong>
          <span>{dados[ativo].rotulo}</span>
        </div>
      )}
    </div>
  );
}

/* ---------- barras horizontais: funil e distribuições ---------- */
export function BarrasH({ dados, formato = "numero", cor = 0 }: {
  dados: { rotulo: string; valor: number; nota?: string }[];
  formato?: Formato;
  cor?: number;
}) {
  const formatar = FORMATA[formato];
  if (!dados.length || dados.every((d) => !d.valor)) return <p className={g.vazio}>Sem dados ainda.</p>;
  const max = Math.max(...dados.map((d) => d.valor), 1);
  return (
    <ul className={g.barras}>
      {dados.map((d) => (
        <li key={d.rotulo} className={g.barraLinha}>
          <span className={g.barraRotulo}>{d.rotulo}</span>
          <span className={g.barraTrilho}>
            <span className={g.barraFill}
              style={{ width: `${Math.max((d.valor / max) * 100, d.valor ? 2 : 0)}%`, background: CORES[cor % CORES.length] }} />
          </span>
          <span className={g.barraValor}>
            {formatar(d.valor)}
            {d.nota && <em className={g.barraNota}>{d.nota}</em>}
          </span>
        </li>
      ))}
    </ul>
  );
}
