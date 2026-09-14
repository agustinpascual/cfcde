import Link from "next/link";
import s from "./filtro.module.css";

const BASE = "/ioh3j4ciof3n3oic/pedidos/abandonados";

/* Formulário GET: a data e a etapa ficam na URL e continuam aplicadas ao
   navegar entre páginas ou atualizar o painel. */
export default function FiltroCarrinhos({
  de, ate, hoje, etapa = "",
}: { de: string; ate: string; hoje: string; etapa?: string }) {
  return (
    <form className={s.filtro} method="get" action={BASE}>
      <label className={s.campoData}>
        <span>De</span>
        <input type="date" name="de" defaultValue={de} max={ate}
          aria-label="Data inicial dos carrinhos abandonados" required />
      </label>
      <label className={s.campoData}>
        <span>Até</span>
        <input type="date" name="ate" defaultValue={ate} min={de} max={hoje}
          aria-label="Data final dos carrinhos abandonados" required />
      </label>

      <select name="etapa" defaultValue={etapa} aria-label="Etapa em que o cliente parou">
        <option value="">Parou em: todas</option>
        <option value="contato">Contato</option>
        <option value="entrega">Entrega</option>
        <option value="pagamento">Pagamento</option>
      </select>

      <button type="submit" className={s.aplicar}>Filtrar</button>
      <Link href={BASE} className={s.limpar}>Hoje</Link>
    </form>
  );
}
