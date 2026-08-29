"use client";
import { useState } from "react";
import type { Sessao } from "./dados";
import m from "./mapa.module.css";

/* Mapa do Brasil em SVG puro, com projeção equiretangular simples.
   Sem biblioteca de mapas e sem chave de API — as coordenadas vêm dos
   headers de geolocalização do Vercel. */

// caixa geográfica do Brasil
const OESTE = -74, LESTE = -34.5, NORTE = 5.5, SUL = -34;
const W = 460, H = 480;

const px = (lng: number) => ((lng - OESTE) / (LESTE - OESTE)) * W;
const py = (lat: number) => ((NORTE - lat) / (NORTE - SUL)) * H;

/* contorno simplificado do território — suficiente para leitura de posição */
const CONTORNO =
  "M181,44 L212,30 L241,40 L263,33 L286,44 L300,66 L318,74 L330,96 L349,110 L363,140 " +
  "L378,168 L392,196 L399,226 L392,256 L378,282 L369,310 L356,338 L338,362 L318,384 " +
  "L296,404 L272,420 L246,432 L222,438 L200,432 L184,416 L176,394 L168,368 L152,348 " +
  "L134,330 L118,308 L104,284 L92,258 L82,230 L74,202 L70,174 L74,146 L86,120 L104,98 " +
  "L124,78 L148,58 Z";

export default function MapaBrasil({ sessoes }: { sessoes: Sessao[] }) {
  const [ativa, setAtiva] = useState<string | null>(null);
  const comGeo = sessoes.filter((s) => s.latitude != null && s.longitude != null);

  return (
    <div className={m.wrap}>
      <svg viewBox={`0 0 ${W} ${H}`} className={m.svg} role="img"
        aria-label={`Mapa com ${comGeo.length} sessões ativas no Brasil`}>
        <path d={CONTORNO} fill="#eef1f6" stroke="#dfe4ec" strokeWidth="1.5" />

        {comGeo.map((s) => {
          const x = px(s.longitude!), y = py(s.latitude!);
          const noCheckout = s.pagina?.startsWith("/checkout") || s.pagina?.startsWith("/pagamento");
          const cor = s.copiou_pix ? "#c2410c" : noCheckout ? "#1d9a8a" : "#2f5fd0";
          return (
            <g key={s.sessao} onMouseEnter={() => setAtiva(s.sessao)} onMouseLeave={() => setAtiva(null)}>
              <circle cx={x} cy={y} r="11" fill={cor} opacity="0.16" className={m.halo} />
              {/* anel branco separa pontos sobrepostos */}
              <circle cx={x} cy={y} r="5" fill={cor} stroke="#fff" strokeWidth="2" className={m.ponto} />
              {ativa === s.sessao && (
                <text x={x} y={y - 14} textAnchor="middle" className={m.rotulo}>
                  {s.cidade ?? "?"}{s.uf ? `/${s.uf}` : ""}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* legenda: identidade nunca só pela cor — cada item tem texto */}
      <ul className={m.legenda}>
        <li><span style={{ background: "#2f5fd0" }} /> Navegando</li>
        <li><span style={{ background: "#1d9a8a" }} /> No checkout</li>
        <li><span style={{ background: "#c2410c" }} /> Copiou o PIX</li>
      </ul>

      {comGeo.length === 0 && (
        <p className={m.vazio}>
          Nenhuma sessão com localização. A geolocalização vem dos headers do Vercel —
          em <code>localhost</code> ela não existe.
        </p>
      )}
    </div>
  );
}
