import type { Metadata } from "next";
import Link from "next/link";
import CascaLoja from "@/components/storefront/CascaLoja";
import GradeProdutos from "@/components/storefront/GradeProdutos";
import { PRODUCTS } from "@/components/sites/cafecomdeuspai-com-8456844d/shared/productCatalog";
import s from "./busca.module.css";

export const metadata: Metadata = {
  title: "Busca",
  /* Página de resultado não deve ser indexada: gera infinitas URLs sem
     conteúdo próprio e dilui o site nos buscadores. */
  robots: { index: false, follow: true },
};

/** Tira acento e caixa, para "cafe" achar "Café". */
const normalizar = (v: string) =>
  v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function buscar(termo: string) {
  const alvo = normalizar(termo);
  if (!alvo) return [];
  /* Cada palavra precisa aparecer em algum campo — assim "caneca vol 6"
     encontra o produto mesmo com as palavras em ordem diferente. */
  const palavras = alvo.split(/\s+/).filter(Boolean);
  return PRODUCTS.filter((p) => {
    const campos = normalizar(`${p.name} ${p.description} ${p.category} ${p.sku}`);
    return palavras.every((w) => campos.includes(w));
  });
}

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const termo = q.trim().slice(0, 80);
  const achados = buscar(termo);

  return (
    <CascaLoja>
    <main className={s.pagina}>
      <h1 className={s.titulo}>{termo ? "Resultados da busca" : "Buscar produtos"}</h1>
      {termo ? (
        <p className={s.resumo}>
          {achados.length === 0
            ? <>Nenhum produto para <b>{termo}</b>.</>
            : <><b>{achados.length}</b> {achados.length === 1 ? "produto encontrado" : "produtos encontrados"} para <b>{termo}</b>.</>}
        </p>
      ) : null}

      <form className={s.form} action="/busca" role="search">
        <input className={s.campo} name="q" type="search" defaultValue={termo}
          placeholder="Digite sua pesquisa" aria-label="Buscar produtos" autoFocus={!termo} />
        <button className={s.enviar} type="submit">Buscar</button>
      </form>

      {achados.length > 0 ? (
        <GradeProdutos produtos={achados} />
      ) : termo ? (
        <div className={s.vazio}>
          <p className={s.vazioTitulo}>Não encontramos esse produto</p>
          <p className={s.vazioTexto}>
            Confira a escrita ou tente um termo mais curto — “caneca”, “brochura”,
            “combo”. Você também pode ver tudo na página inicial.
          </p>
          <div className={s.sugestoes}>
            {["caneca", "brochura", "combo", "planner"].map((t) => (
              <Link key={t} href={`/busca?q=${encodeURIComponent(t)}`} className={s.sugestao}>{t}</Link>
            ))}
            <Link href="/" className={s.sugestao}>Ver todos</Link>
          </div>
        </div>
      ) : null}
    </main>
    </CascaLoja>
  );
}
