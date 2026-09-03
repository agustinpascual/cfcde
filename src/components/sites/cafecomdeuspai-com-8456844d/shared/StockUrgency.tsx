"use client";

import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./StockUrgency.module.css";

export type EstoqueLote = {
  /* tamanho do lote e quantas unidades ele começa oferecendo */
  lote: number;
  restantes: number;
  /* minutos de reserva da oferta */
  minutos: number;
  /* piso do contador quando o tempo zera */
  minimo?: number;
  /* onde o fim do lote fica guardado no navegador */
  chave?: string;
};

const doisDigitos = (valor: number) => String(valor).padStart(2, "0");

function leFim(chave: string, duracaoMs: number) {
  try {
    const salvo = Number(localStorage.getItem(chave));
    /* Lote vencido (ou primeira visita) começa um novo ciclo. */
    if (Number.isFinite(salvo) && salvo > Date.now()) return salvo;
    const fim = Date.now() + duracaoMs;
    localStorage.setItem(chave, String(fim));
    return fim;
  } catch {
    /* storage bloqueado: a contagem vale só para esta aba */
    return Date.now() + duracaoMs;
  }
}

export default function StockUrgency({
  lote,
  restantes,
  minutos,
  minimo = 7,
  chave = "cdp-lote-combo-plus",
}: EstoqueLote) {
  const total = minutos * 60;
  /* Servidor e primeiro render mostram o lote cheio; o valor real vem do
     storage logo depois, senão a hidratação quebra. */
  const [segundos, setSegundos] = useState(total);

  useEffect(() => {
    const duracaoMs = total * 1000;
    let fim = leFim(chave, duracaoMs);

    const atualiza = () => {
      if (fim <= Date.now()) {
        fim = Date.now() + duracaoMs;
        try { localStorage.setItem(chave, String(fim)); } catch {}
      }
      setSegundos(Math.max(0, Math.round((fim - Date.now()) / 1000)));
    };

    atualiza();
    const timer = window.setInterval(atualiza, 1000);
    return () => window.clearInterval(timer);
  }, [total, chave]);

  /* O estoque acompanha o relógio: lote cheio no início, `minimo` no fim.
     Assim, quem chega faltando poucos minutos vê poucas unidades. */
  const disponivel = Math.max(minimo, Math.min(restantes, lote));
  const unidades = minimo + Math.round((disponivel - minimo) * (segundos / total));
  const percentual = Math.round((unidades / lote) * 100);

  return (
    <div className={styles.bloco}>
      <div className={styles.topo}>
        <span className={styles.lote}>1º lote promocional</span>
        <span className={styles.relogio}>
          <Clock aria-hidden="true" strokeWidth={2} />
          <span aria-label={`Oferta reservada por ${Math.floor(segundos / 60)} minutos e ${segundos % 60} segundos`}>
            {doisDigitos(Math.floor(segundos / 60))}:{doisDigitos(segundos % 60)}
          </span>
        </span>
      </div>
      <p className={styles.contagem} aria-live="polite">
        Restam <strong>{unidades}</strong> de <strong>{lote}</strong> unidades
      </p>
      <div className={styles.barra} role="progressbar" aria-valuemin={0} aria-valuemax={lote} aria-valuenow={unidades}>
        <span style={{ width: `${percentual}%` }} />
      </div>
      <p className={styles.aviso}>Ao fim da contagem o preço volta ao valor normal.</p>
    </div>
  );
}
