import { rotuloDispositivo, type Jornada, type EventoJornada } from "./dados";
import s from "./jornada.module.css";

/* Linha do tempo do comportamento do cliente naquela compra: clicou em
   comprar, quanto levou para preencher, copiou o PIX, voltou depois de copiar.
   Tudo sai das tabelas `sessoes`/`eventos`, ligadas ao pedido por pedido_ref. */

/* O Worker roda em UTC; sem fixar o fuso, o horário apareceria 3h adiantado.
   As durações são deltas e não dependem disto — só o relógio absoluto. */
const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/Sao_Paulo",
  });

/* Duração curta e legível: "8 s", "1 min 34 s", "2 h 05 min". */
function dur(segundos: number): string {
  const s2 = Math.max(0, Math.round(segundos));
  if (s2 < 60) return `${s2} s`;
  const m = Math.floor(s2 / 60), r = s2 % 60;
  if (m < 60) return r ? `${m} min ${String(r).padStart(2, "0")} s` : `${m} min`;
  const h = Math.floor(m / 60), rm = m % 60;
  return `${h} h ${String(rm).padStart(2, "0")} min`;
}

const primeiro = (evs: EventoJornada[], tipo: string) => evs.find((e) => e.tipo === tipo);
const t = (e?: EventoJornada) => (e ? Date.parse(e.criado_em) : null);
const delta = (a: number | null, b: number | null) => (a !== null && b !== null && b >= a ? (b - a) / 1000 : null);

type Passo = { rotulo: string; feito: boolean; detalhe: string };

export default function JornadaCliente({ jornada }: { jornada: Jornada }) {
  const { sessao, eventos } = jornada;

  if (!sessao || !eventos.length) {
    return (
      <section className={s.bloco}>
        <h2 className={s.titulo}>Comportamento do cliente</h2>
        <p className={s.vazio}>
          Sem trilha registrada para este pedido. O rastreamento começou a valer
          para novas compras — pedidos antigos podem não ter dados.
        </p>
      </section>
    );
  }

  const comprar = primeiro(eventos, "comprar");
  const checkout = primeiro(eventos, "checkout");
  const gerado = primeiro(eventos, "pix_gerado");
  const copiado = primeiro(eventos, "pix_copiado");
  const voltou = primeiro(eventos, "voltou");

  const tComprar = t(comprar), tCheckout = t(checkout), tGerado = t(gerado), tCopiado = t(copiado);

  const preenchimento = delta(tCheckout, tGerado);
  const ateComprarCheckout = delta(tComprar, tCheckout);
  const segundosNaTela = typeof copiado?.dados?.segundos_na_tela === "number"
    ? (copiado.dados.segundos_na_tela as number)
    : delta(tGerado, tCopiado);
  const segundosFora = typeof voltou?.dados?.segundos_fora === "number"
    ? (voltou.dados.segundos_fora as number)
    : null;

  const passos: Passo[] = [
    {
      rotulo: "Clicou em comprar",
      feito: !!comprar,
      detalhe: comprar
        ? `às ${hora(comprar.criado_em)}${ateComprarCheckout !== null ? ` · ${dur(ateComprarCheckout)} até o checkout` : ""}`
        : "não registrado",
    },
    {
      rotulo: "Entrou no checkout",
      feito: !!checkout,
      detalhe: checkout ? `às ${hora(checkout.criado_em)}` : "não chegou ao checkout",
    },
    {
      rotulo: "Preencheu as informações",
      feito: !!gerado,
      detalhe: gerado
        ? (preenchimento !== null ? `levou ${dur(preenchimento)}` : `PIX gerado às ${hora(gerado.criado_em)}`)
        : "não gerou o PIX",
    },
    {
      rotulo: "Copiou o código PIX",
      feito: !!copiado,
      detalhe: copiado
        ? `às ${hora(copiado.criado_em)}${segundosNaTela !== null ? ` · ${dur(segundosNaTela)} após gerar` : ""}`
        : "não copiou",
    },
    {
      rotulo: "Voltou ao site após copiar",
      feito: !!voltou,
      detalhe: voltou
        ? (segundosFora !== null ? `voltou após ${dur(segundosFora)} fora` : "voltou à página")
        : copiado ? "não voltou depois de copiar" : "—",
    },
  ];

  const local = [sessao.cidade, sessao.uf].filter(Boolean).join(" - ");

  return (
    <section className={s.bloco}>
      <h2 className={s.titulo}>Comportamento do cliente</h2>
      <p className={s.resumo}>
        {rotuloDispositivo(sessao.dispositivo)}
        {local ? ` · ${local}` : ""}
        {sessao.copiou_pix ? " · copiou o PIX" : ""}
      </p>
      <ol className={s.linha}>
        {passos.map((p) => (
          <li key={p.rotulo} className={p.feito ? s.feito : s.pendente}>
            <span className={s.marca} aria-hidden="true">{p.feito ? "✓" : "○"}</span>
            <span className={s.texto}>
              <strong>{p.rotulo}</strong>
              <em>{p.detalhe}</em>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
