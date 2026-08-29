import Link from "next/link";
import SiteFooter from "../SiteFooter";
import SiteHeader from "../SiteHeader";
import s from "./pagina.module.css";

/* Casca comum das páginas institucionais: header e rodapé da loja,
   com um cabeçalho azul e a coluna de leitura de 860px. */
export default function PaginaInstitucional({
  titulo, subtitulo, children,
}: { titulo: string; subtitulo?: string; children: React.ReactNode }) {
  return (
    <div className={s.wrap}>
      <SiteHeader />

      <header className={s.hero}>
        <div className={`bb-container ${s.heroInner}`}>
          <p className={s.trilha}><Link href="/">Página inicial</Link> › {titulo}</p>
          <h1 className={s.titulo}>{titulo}</h1>
          {subtitulo && <p className={s.sub}>{subtitulo}</p>}
        </div>
      </header>

      <main className="bb-container">
        <div className={s.conteudo}>{children}</div>
      </main>

      <SiteFooter />
    </div>
  );
}
