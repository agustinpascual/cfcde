"use client";

import { useState } from "react";
import { Download, X } from "lucide-react";
import s from "./exportar.module.css";

const STATUS = [
  { id: "pago", rotulo: "Pago" },
  { id: "pendente", rotulo: "Pendente" },
  { id: "recusado", rotulo: "Recusado" },
  { id: "estornado", rotulo: "Estornado" },
];
const METODOS = [
  { id: "pix", rotulo: "PIX" },
  { id: "cartao", rotulo: "Cartão" },
];

/* Botão "Exportar" + diálogo para escolher status, método e período do CSV.
   Nenhum selecionado = todos. Monta a URL do endpoint e baixa o arquivo. */
export default function ExportarPedidos({ de = "", ate = "" }: { de?: string; ate?: string }) {
  const [aberto, setAberto] = useState(false);
  const [status, setStatus] = useState<string[]>([]);
  const [metodo, setMetodo] = useState<string[]>([]);
  const [inicio, setInicio] = useState(de);
  const [fim, setFim] = useState(ate);

  const alterna = (lista: string[], set: (v: string[]) => void, id: string) =>
    set(lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]);

  function exportar() {
    const p = new URLSearchParams();
    if (status.length) p.set("status", status.join(","));
    if (metodo.length) p.set("metodo", metodo.join(","));
    if (inicio) p.set("de", inicio);
    if (fim) p.set("ate", fim);
    const qs = p.toString();
    // GET num endpoint que responde com Content-Disposition: attachment → baixa
    window.location.href = `/api/painel/pedidos/exportar${qs ? `?${qs}` : ""}`;
    setAberto(false);
  }

  return (
    <>
      <button type="button" className={s.botao} onClick={() => setAberto(true)}>
        <Download size={16} aria-hidden="true" /> Exportar
      </button>

      {aberto && (
        <div className={s.fundo} role="dialog" aria-modal="true" aria-label="Exportar pedidos"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setAberto(false); }}>
          <div className={s.caixa}>
            <div className={s.cabecalho}>
              <h2>Exportar pedidos</h2>
              <button type="button" className={s.fechar} onClick={() => setAberto(false)} aria-label="Fechar">
                <X size={18} />
              </button>
            </div>
            <p className={s.ajuda}>Baixe um CSV com os pedidos. Sem seleção, exporta todos.</p>

            <fieldset className={s.grupo}>
              <legend>Status do pagamento</legend>
              <div className={s.opcoes}>
                {STATUS.map((o) => (
                  <label key={o.id} className={status.includes(o.id) ? s.chipAtivo : s.chip}>
                    <input type="checkbox" checked={status.includes(o.id)}
                      onChange={() => alterna(status, setStatus, o.id)} />
                    {o.rotulo}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className={s.grupo}>
              <legend>Método de pagamento</legend>
              <div className={s.opcoes}>
                {METODOS.map((o) => (
                  <label key={o.id} className={metodo.includes(o.id) ? s.chipAtivo : s.chip}>
                    <input type="checkbox" checked={metodo.includes(o.id)}
                      onChange={() => alterna(metodo, setMetodo, o.id)} />
                    {o.rotulo}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className={s.grupo}>
              <legend>Período (opcional)</legend>
              <div className={s.datas}>
                <label>De<input type="date" value={inicio} max={fim || undefined} onChange={(e) => setInicio(e.target.value)} /></label>
                <label>Até<input type="date" value={fim} min={inicio || undefined} onChange={(e) => setFim(e.target.value)} /></label>
              </div>
            </fieldset>

            <div className={s.acoes}>
              <button type="button" className={s.cancelar} onClick={() => setAberto(false)}>Cancelar</button>
              <button type="button" className={s.confirmar} onClick={exportar}>
                <Download size={16} aria-hidden="true" /> Baixar CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
