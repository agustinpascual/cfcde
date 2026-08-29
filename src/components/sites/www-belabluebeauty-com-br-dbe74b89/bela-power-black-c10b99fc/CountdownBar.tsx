"use client";
import { useEffect, useState } from "react";
import { countdownMessage } from "./data";
import s from "./styles.module.css";

/* .top-countdown-message__item — flex center gap 20px h34
   .cd-item = <span>00</span><small>Dia(s)</small>, separados por .cd-item-separator ":" */
/* O timer do original exibe menos de 1 dia (ex.: "00 Dia(s) 02 Hora(s)").
   Usamos um ciclo rotativo de 3 dias para reproduzir esse comportamento. */
const CICLO = 3 * 86400 * 1000;

export default function CountdownBar() {
  const [partes, setPartes] = useState<string[] | null>(null);

  useEffect(() => {
    const tick = () => {
      const dif = Math.floor((CICLO - (Date.now() % CICLO)) / 1000);
      setPartes(
        [Math.floor(dif / 86400), Math.floor((dif % 86400) / 3600), Math.floor((dif % 3600) / 60), dif % 60]
          .map((n) => String(n).padStart(2, "0"))
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const labels = ["Dia(s)", "Hora(s)", "Min(s)", "Seg(s)"];

  return (
    <div className={s.countdown}>
      <div className={s.countdownItem}>
        <div className={s.countdownMsg}>{countdownMessage}</div>
        <div className={s.countdownTimer} suppressHydrationWarning>
          {labels.map((l, i) => (
            <span key={l} style={{ display: "contents" }}>
              {i > 0 && <div className={s.cdSep}>:</div>}
              <div className={s.cdItem}>
                <span>{partes ? partes[i] : "00"}</span>
                <small>{l}</small>
              </div>
            </span>
          ))}
        </div>
        <button type="button" className={s.cdBtn}
          onClick={() => document.getElementById("produto")?.scrollIntoView({ behavior: "smooth" })}>
          Confira
        </button>
      </div>
    </div>
  );
}
