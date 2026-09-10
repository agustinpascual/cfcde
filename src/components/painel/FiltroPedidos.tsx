import { Search } from "lucide-react";
import Link from "next/link";
import s from "./filtro.module.css";

/* Filtro da lista de pedidos. Form GET puro: os valores viram query params,
   então funciona sem JavaScript, dá para recarregar e compartilhar o link
   filtrado, e o servidor recalcula a consulta. */
export default function FiltroPedidos({
  busca = "", status = "", metodo = "", de = "", ate = "",
}: { busca?: string; status?: string; metodo?: string; de?: string; ate?: string }) {
  return (
    <form className={s.filtro} method="get" action="/painel/pedidos">
      <div className={s.campoBusca}>
        <Search size={16} aria-hidden="true" />
        <input
          type="search" name="busca" defaultValue={busca}
          placeholder="Buscar por nome, e-mail, CPF ou pedido"
          aria-label="Buscar pedidos"
        />
      </div>

      <select name="status" defaultValue={status} aria-label="Status do pagamento">
        <option value="">Todos os status</option>
        <option value="pago">Pago</option>
        <option value="pendente">Pendente</option>
        <option value="recusado">Recusado</option>
        <option value="estornado">Estornado</option>
      </select>

      <select name="metodo" defaultValue={metodo} aria-label="Método de pagamento">
        <option value="">Todos os métodos</option>
        <option value="pix">PIX</option>
        <option value="cartao">Cartão</option>
      </select>

      <label className={s.campoData}>
        <span>De</span>
        <input type="date" name="de" defaultValue={de} aria-label="Data inicial" />
      </label>
      <label className={s.campoData}>
        <span>Até</span>
        <input type="date" name="ate" defaultValue={ate} aria-label="Data final" />
      </label>

      <button type="submit" className={s.aplicar}>Filtrar</button>
      {(busca || status || metodo || de || ate) && (
        <Link href="/painel/pedidos" className={s.limpar}>Limpar</Link>
      )}
    </form>
  );
}
