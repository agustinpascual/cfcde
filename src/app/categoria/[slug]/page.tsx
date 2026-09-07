import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CascaLoja from "@/components/storefront/CascaLoja";
import GradeProdutos from "@/components/storefront/GradeProdutos";
import { PRODUCTS, type ProductCategory } from "@/components/sites/cafecomdeuspai-com-8456844d/shared/productCatalog";
import s from "./categoria.module.css";

/* Páginas de seção. O menu do site apontava para rotas que não existiam e
   devolviam 404 — agora cada aba leva à lista real daquela categoria.
   A fonte é o mesmo catálogo que gera as páginas de produto e a busca. */

type Secao = { titulo: string; subtitulo: string; categoria: ProductCategory };

const SECOES: Record<string, Secao> = {
  lancamento: {
    titulo: "Lançamentos",
    subtitulo: "As edições mais novas do Café com Deus Pai.",
    categoria: "Lançamento",
  },
  destaques: {
    titulo: "Destaques",
    subtitulo: "O que mais sai da nossa loja.",
    categoria: "Destaques",
  },
  imperdivel: {
    titulo: "Imperdível",
    subtitulo: "Combos com o melhor preço.",
    categoria: "Imperdível",
  },
};

export function generateStaticParams() {
  return Object.keys(SECOES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const secao = SECOES[slug];
  if (!secao) return { title: "Seção não encontrada" };
  return {
    title: secao.titulo,
    description: secao.subtitulo,
    alternates: { canonical: `/categoria/${slug}` },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const secao = SECOES[slug];
  if (!secao) notFound();

  const produtos = PRODUCTS.filter((p) => p.category === secao.categoria);

  return (
    <CascaLoja>
      <main className={s.pagina}>
        <h1 className={s.titulo}>{secao.titulo}</h1>
        <p className={s.subtitulo}>{secao.subtitulo}</p>

        {produtos.length ? (
          <GradeProdutos produtos={produtos} />
        ) : (
          <p className={s.vazio}>
            Ainda não há produtos nesta seção. <Link href="/">Ver a loja</Link>
          </p>
        )}
      </main>
    </CascaLoja>
  );
}
