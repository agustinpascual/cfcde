import Link from "next/link";
import s from "./painel.module.css";

/* Paginação por link — funciona sem JavaScript e mantém a página na URL,
   então dá para recarregar ou compartilhar sem perder o lugar. */
export default function Paginacao({ pagina, total, porPagina, base, query }: {
  pagina: number; total: number; porPagina: number; base: string;
  query?: Record<string, string | undefined>;
}) {
  const paginas = Math.ceil(total / porPagina);
  if (paginas <= 1) return null;

  /* Mantém os filtros (busca/status/método) ao trocar de página. */
  const url = (n: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(query ?? {})) if (v) sp.set(k, v);
    if (n > 1) sp.set("p", String(n));
    const qs = sp.toString();
    return qs ? `${base}?${qs}` : base;
  };
  const primeiro = (pagina - 1) * porPagina + 1;
  const ultimo = Math.min(pagina * porPagina, total);

  /* Janela de até 5 números em volta da página atual, para não estourar
     a linha quando houver centenas de pedidos. */
  const inicio = Math.max(1, Math.min(pagina - 2, paginas - 4));
  const numeros = Array.from({ length: Math.min(5, paginas) }, (_, i) => inicio + i);

  return (
    <nav className={s.paginacao} aria-label="Paginação dos pedidos">
      <p className={s.paginacaoInfo}>
        {primeiro}–{ultimo} de {total}
      </p>
      <div className={s.paginacaoBotoes}>
        {pagina > 1 ? (
          <Link href={url(pagina - 1)} className={s.pagBotao} rel="prev">Anterior</Link>
        ) : (
          <span className={`${s.pagBotao} ${s.pagDesativado}`} aria-disabled>Anterior</span>
        )}

        {numeros[0] > 1 && <span className={s.pagReticencia}>…</span>}
        {numeros.map((n) =>
          n === pagina ? (
            <span key={n} className={`${s.pagNumero} ${s.pagAtual}`} aria-current="page">{n}</span>
          ) : (
            <Link key={n} href={url(n)} className={s.pagNumero}>{n}</Link>
          )
        )}
        {numeros[numeros.length - 1] < paginas && <span className={s.pagReticencia}>…</span>}

        {pagina < paginas ? (
          <Link href={url(pagina + 1)} className={s.pagBotao} rel="next">Próxima</Link>
        ) : (
          <span className={`${s.pagBotao} ${s.pagDesativado}`} aria-disabled>Próxima</span>
        )}
      </div>
    </nav>
  );
}
