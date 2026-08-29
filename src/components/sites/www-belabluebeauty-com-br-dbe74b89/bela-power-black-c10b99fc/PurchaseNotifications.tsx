"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cidades, kitsCompra, nomesFemininos, nomesMasculinos, produto, sobrenomes } from "./data";
import { useStock } from "./StockContext";
import s from "./styles.module.css";

/* Notificação de prova social no canto inferior esquerdo.
   Os dados são SINTÉTICOS (gerados no cliente) — nomes, cidades e horários são
   sorteados a cada exibição e cada notificação decrementa o estoque exibido. */
type Compra = { id: number; nome: string; cidade: string; kit: string; minutos: number };

const sorteia = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

function geraCompra(id: number): Compra {
  const primeiro = Math.random() < 0.72 ? sorteia(nomesFemininos) : sorteia(nomesMasculinos);
  const sobrenome = sorteia(sobrenomes);
  return {
    id,
    nome: `${primeiro} ${sobrenome.charAt(0)}.`,
    cidade: sorteia(cidades),
    kit: sorteia(kitsCompra),
    minutos: 1 + Math.floor(Math.random() * 24),
  };
}

const PRIMEIRA_ESPERA = 6000;   // primeira notificação
const VISIVEL = 6000;           // tempo na tela
const INTERVALO_MIN = 12000;    // intervalo entre notificações
const INTERVALO_MAX = 26000;

export default function PurchaseNotifications() {
  const [compra, setCompra] = useState<Compra | null>(null);
  const [saindo, setSaindo] = useState(false);
  const { registrarCompra } = useStock();
  const contador = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // respeita quem prefere menos animação
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const agenda = (atraso: number) => {
      timers.current.push(
        setTimeout(() => {
          contador.current += 1;
          setSaindo(false);
          setCompra(geraCompra(contador.current));
          registrarCompra();

          timers.current.push(setTimeout(() => setSaindo(true), VISIVEL - 400));
          timers.current.push(setTimeout(() => setCompra(null), VISIVEL));
          agenda(VISIVEL + INTERVALO_MIN + Math.random() * (INTERVALO_MAX - INTERVALO_MIN));
        }, atraso)
      );
    };

    agenda(PRIMEIRA_ESPERA);
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, [registrarCompra]);

  if (!compra) return null;

  return (
    <div className={`${s.toast} ${saindo ? s.toastSaindo : ""}`} role="status" aria-live="polite">
      <span className={s.toastImg}>
        <Image src={produto.galeria[0].thumb} alt="" width={54} height={54} sizes="54px" />
      </span>
      <span className={s.toastTexto}>
        <span className={s.toastPessoa}>
          <strong>{compra.nome}</strong> de <strong>{compra.cidade}</strong>
        </span>
        <span className={s.toastProduto}>comprou {compra.kit} de {produto.nome}</span>
        <span className={s.toastTempo}>há {compra.minutos} {compra.minutos === 1 ? "minuto" : "minutos"} · compra verificada</span>
      </span>
      <button className={s.toastFechar} aria-label="Fechar notificação" onClick={() => setCompra(null)}>×</button>
    </div>
  );
}
