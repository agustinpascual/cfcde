import Link from "next/link";
import s from "./painel.module.css";

/* Aparece no topo de todo painel enquanto faltarem tabelas — sem isso a tela
   mostra zeros e parece que o rastreamento está quebrado. */
export default function FaixaInstalar({ faltam }: { faltam: number }) {
  if (faltam <= 0) return null;
  return (
    <div className={s.faixaInstalar}>
      <p>
        <strong>O banco ainda não foi criado</strong>
        {faltam === 8
          ? "Nenhuma tabela existe no Supabase, então nada é gravado: pedidos, mapa ao vivo e funil ficam zerados."
          : `Faltam ${faltam} tabelas. As telas que dependem delas ficam zeradas.`}
      </p>
      <Link href="/painel/instalar">Instalar agora</Link>
    </div>
  );
}
