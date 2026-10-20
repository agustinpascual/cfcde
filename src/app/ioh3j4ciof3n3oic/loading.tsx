import s from "@/components/painel/painel.module.css";

export default function Loading() {
  return (
    <div className={s.app}>
      <main className={s.corpo} aria-busy="true" role="status">
        <h1 className={s.titulo}>Painel administrativo</h1>
        <p className={s.subtitulo}>Carregando os dados do painel…</p>
      </main>
    </div>
  );
}
