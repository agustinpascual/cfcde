import Link from "next/link";
import s from "./painel.module.css";

/* Aparece no topo de todo painel enquanto faltarem tabelas — sem isso a tela
   mostra zeros e parece que o rastreamento está quebrado. */
export default function FaixaInstalar({ faltam }: { faltam: number }) {
  if (faltam <= 0) return null;
  return (
    <div className={s.faixaInstalar}>
      <p>
        <strong>O banco precisa ser atualizado</strong>
        {`Há ${faltam} ${faltam === 1 ? "item pendente" : "itens pendentes"} (tabela ou coluna). As telas relacionadas podem ficar incompletas.`}
      </p>
      <Link href="/ioh3j4ciof3n3oic/instalar">Instalar agora</Link>
    </div>
  );
}
