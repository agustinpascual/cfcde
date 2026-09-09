import Link from "next/link";
import s from "./subabas.module.css";

/* Abas dentro de Pedidos: a lista de pedidos e os carrinhos abandonados.
   `atual` marca qual está ativa. `abandonados` mostra a contagem quando há. */
export default function SubAbasPedidos({
  atual, abandonados = 0,
}: { atual: "pedidos" | "abandonados"; abandonados?: number }) {
  return (
    <nav className={s.abas} aria-label="Seções de pedidos">
      <Link href="/painel/pedidos" className={atual === "pedidos" ? s.ativa : s.aba}>
        Pedidos
      </Link>
      <Link href="/painel/pedidos/abandonados" className={atual === "abandonados" ? s.ativa : s.aba}>
        Abandonados
        {abandonados > 0 && <span className={s.contador}>{abandonados}</span>}
      </Link>
    </nav>
  );
}
