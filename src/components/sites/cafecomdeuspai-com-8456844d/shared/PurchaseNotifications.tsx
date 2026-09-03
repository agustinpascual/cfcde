"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { geraCompra, type Compra } from "./socialProof";
import styles from "./PurchaseNotifications.module.css";

type Props = { imagem: string; nome: string };

const PRIMEIRA = 6000;
const VISIVEL = 6000;
const INTERVALO_MIN = 12000;
const INTERVALO_MAX = 26000;

export default function PurchaseNotifications({ imagem, nome }: Props) {
  const [compra, setCompra] = useState<Compra | null>(null);
  const [saindo, setSaindo] = useState(false);
  const contador = useRef(0);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const agenda = (atraso: number) => {
      timers.push(setTimeout(() => {
        contador.current += 1;
        setSaindo(false);
        setCompra(geraCompra(contador.current));
        timers.push(setTimeout(() => setSaindo(true), VISIVEL - 400));
        timers.push(setTimeout(() => setCompra(null), VISIVEL));
        agenda(VISIVEL + INTERVALO_MIN + Math.random() * (INTERVALO_MAX - INTERVALO_MIN));
      }, atraso));
    };

    agenda(PRIMEIRA);
    return () => timers.forEach(clearTimeout);
  }, []);

  if (!compra) return null;

  return (
    <div className={`${styles.toast} ${saindo ? styles.saindo : ""}`} role="status" aria-live="polite">
      <span className={styles.imagem}>
        <Image src={imagem} alt="" width={54} height={54} sizes="54px" />
      </span>
      <span className={styles.texto}>
        <span className={styles.pessoa}>
          <strong>{compra.nome}</strong> de <strong>{compra.cidade}</strong>
        </span>
        <span className={styles.produto}>comprou {nome}</span>
        <span className={styles.tempo}>
          há {compra.minutos} {compra.minutos === 1 ? "minuto" : "minutos"} · compra verificada
        </span>
      </span>
      <button className={styles.fechar} type="button" onClick={() => setCompra(null)} aria-label="Fechar notificação">
        ×
      </button>
    </div>
  );
}
