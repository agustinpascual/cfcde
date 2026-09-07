import Image from "next/image";
import Link from "next/link";
import type { CatalogProduct } from "@/components/sites/cafecomdeuspai-com-8456844d/shared/productCatalog";
import s from "./GradeProdutos.module.css";

/* Grade de produtos usada pela busca e pelas páginas de seção.
   Uma só implementação: se a busca e a categoria divergissem no visual, o
   cliente perceberia que são "duas lojas" dentro do mesmo site. */
export default function GradeProdutos({ produtos }: { produtos: readonly CatalogProduct[] }) {
  if (!produtos.length) return null;

  return (
    <div className={s.grade}>
      {produtos.map((p) => (
        <Link key={p.slug} href={`/produtos/${p.slug}`} className={s.card}>
          <span className={s.imagem}>
            <Image src={p.image} alt={p.name} width={400} height={400} />
          </span>
          <p className={s.categoria}>{p.category}</p>
          <p className={s.nome}>{p.name}</p>
          <p className={s.preco}>
            <span>
              {p.price}
              {p.originalPrice ? <span className={s.de}> {p.originalPrice}</span> : null}
            </span>
            {p.installment ? <span className={s.parcela}>{p.installment}</span> : null}
          </p>
        </Link>
      ))}
    </div>
  );
}
