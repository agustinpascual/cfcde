"use client";
import { useState } from "react";
import s from "./painel.module.css";

export default function Instalador({ sql, editor }: { sql: string; editor: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(sql);
    } catch {
      // navegador sem permissão de área de transferência: seleciona para Ctrl+C
      const el = document.getElementById("sqlBox") as HTMLTextAreaElement | null;
      el?.select();
      return;
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  return (
    <>
      <div className={s.instalarAcoes}>
        <button type="button" onClick={copiar} className={s.botaoPrim}>
          {copiado ? "SQL copiado" : "Copiar SQL"}
        </button>
        <a href={editor} target="_blank" rel="noreferrer" className={s.botaoSec}>
          Abrir o SQL Editor
        </a>
      </div>
      <textarea id="sqlBox" className={s.sqlBox} readOnly value={sql} spellCheck={false} />
    </>
  );
}
