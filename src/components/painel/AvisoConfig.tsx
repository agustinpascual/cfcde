import s from "./painel.module.css";

/* Aparece quando falta configuração — em vez de mostrar zeros sem explicação. */
export default function AvisoConfig({ faltando }: { faltando: string[] }) {
  if (!faltando.length) return null;
  return (
    <div className={s.aviso}>
      <p className={s.avisoTitulo}>Configuração pendente</p>
      <p>
        {faltando.length === 1 ? "Falta " : "Faltam "}
        {faltando.map((f, i) => (
          <span key={f}>{i > 0 && (i === faltando.length - 1 ? " e " : ", ")}<code>{f}</code></span>
        ))}
        . Enquanto isso o painel mostra zero porque nada está sendo gravado.
      </p>
    </div>
  );
}
