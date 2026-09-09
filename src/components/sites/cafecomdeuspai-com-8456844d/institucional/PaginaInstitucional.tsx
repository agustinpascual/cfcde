import CascaLoja from "@/components/storefront/CascaLoja";
import s from "./pagina.module.css";

export default function PaginaInstitucional({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
}) {
  return (
    <CascaLoja>
      <header className={s.hero}>
        <div>
          <p>Loja oficial</p>
          <h1>{titulo}</h1>
          {subtitulo ? <span>{subtitulo}</span> : null}
        </div>
      </header>
      <main className={s.main}>{children}</main>
    </CascaLoja>
  );
}
