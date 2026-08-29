"use client";
import { useMemo, useState } from "react";
import type { Sessao } from "./dados";
import { ESTADOS, MAPA } from "./mapa-brasil";
import m from "./mapa.module.css";

/* Mapa do Brasil com a malha real do IBGE por estado.
   Sem biblioteca de mapas e sem chave de API — as coordenadas das sessões
   vêm dos headers de geolocalização do Vercel. */

const cosLat = Math.cos((MAPA.latMedia * Math.PI) / 180);
const escala = MAPA.largura / (MAPA.leste - MAPA.oeste);
const px = (lng: number) => (lng - MAPA.oeste) * escala;
const py = (lat: number) => (MAPA.norte - lat) * escala * cosLat;

type Grupo = { chave: string; x: number; y: number; sessoes: Sessao[] };

export default function MapaBrasil({ sessoes }: { sessoes: Sessao[] }) {
  const [ativo, setAtivo] = useState<string | null>(null);

  /* agrupa quem está na mesma cidade para não empilhar pontos idênticos */
  const grupos = useMemo<Grupo[]>(() => {
    const mapa = new Map<string, Grupo>();
    for (const s of sessoes) {
      if (s.latitude == null || s.longitude == null) continue;
      const chave = `${s.latitude.toFixed(2)},${s.longitude.toFixed(2)}`;
      const g = mapa.get(chave);
      if (g) g.sessoes.push(s);
      else mapa.set(chave, { chave, x: px(s.longitude), y: py(s.latitude), sessoes: [s] });
    }
    return [...mapa.values()];
  }, [sessoes]);

  /* contagem por UF, para pintar os estados com mais gente */
  const porUf = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of sessoes) if (s.uf) c[s.uf] = (c[s.uf] ?? 0) + 1;
    return c;
  }, [sessoes]);
  const maxUf = Math.max(1, ...Object.values(porUf));

  const corDo = (s: Sessao) =>
    s.copiou_pix ? "#c2410c"
      : s.pagina?.startsWith("/checkout") || s.pagina?.startsWith("/pagamento") ? "#1d9a8a"
      : "#2f5fd0";

  return (
    <div className={m.wrap}>
      <svg viewBox={`0 0 ${MAPA.largura} ${MAPA.altura}`} className={m.svg} role="img"
        aria-label={`Mapa do Brasil com ${grupos.length} localidade(s) e ${sessoes.length} sessão(ões) ativas`}>

        {/* estados: escala sequencial de um só tom, clara → escura */}
        {ESTADOS.map((e) => {
          const n = porUf[e.uf] ?? 0;
          const intensidade = n ? 0.1 + (n / maxUf) * 0.28 : 0;
          return (
            <path key={e.uf} d={e.d}
              fill={n ? `rgba(47,95,208,${intensidade.toFixed(3)})` : "#eef1f6"}
              stroke="#dbe1ea" strokeWidth="0.7" strokeLinejoin="round">
              <title>{e.uf}{n ? ` — ${n} online` : ""}</title>
            </path>
          );
        })}

        {/* siglas só onde há gente, para não poluir */}
        {ESTADOS.filter((e) => porUf[e.uf]).map((e) => (
          <text key={`t-${e.uf}`} x={e.x} y={e.y} textAnchor="middle" className={m.sigla}>{e.uf}</text>
        ))}

        {grupos.map((g) => {
          const principal = g.sessoes[0];
          const cor = corDo(principal);
          const r = g.sessoes.length > 1 ? 7 : 5;
          return (
            <g key={g.chave} onMouseEnter={() => setAtivo(g.chave)} onMouseLeave={() => setAtivo(null)}>
              <circle cx={g.x} cy={g.y} r={r + 6} fill={cor} opacity="0.18" className={m.halo} />
              {/* anel branco separa pontos sobrepostos */}
              <circle cx={g.x} cy={g.y} r={r} fill={cor} stroke="#fff" strokeWidth="2" className={m.ponto} />
              {g.sessoes.length > 1 && (
                <text x={g.x} y={g.y + 3.4} textAnchor="middle" className={m.contagem}>{g.sessoes.length}</text>
              )}
              {ativo === g.chave && (
                <text x={g.x} y={g.y - r - 8} textAnchor="middle" className={m.rotulo}>
                  {principal.cidade ?? "?"}{principal.uf ? `/${principal.uf}` : ""}
                  {g.sessoes.length > 1 ? ` · ${g.sessoes.length} pessoas` : ""}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* identidade nunca só pela cor — cada item tem texto */}
      <ul className={m.legenda}>
        <li><span style={{ background: "#2f5fd0" }} /> Navegando</li>
        <li><span style={{ background: "#1d9a8a" }} /> No checkout</li>
        <li><span style={{ background: "#c2410c" }} /> Copiou o PIX</li>
      </ul>

      {grupos.length === 0 && (
        <p className={m.vazio}>
          Nenhuma sessão com localização. A geolocalização vem dos headers do Vercel —
          em <code>localhost</code> ela não existe.
        </p>
      )}
    </div>
  );
}
