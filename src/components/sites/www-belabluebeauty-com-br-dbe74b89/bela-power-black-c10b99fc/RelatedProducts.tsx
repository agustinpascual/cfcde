import Image from "next/image";
import { relateds } from "./data";
import { HeartIcon } from "./icons";
import s from "./styles.module.css";

/* As tarjas "TOP ENTRE OS PRODUTOS MAIS VENDIDOS" e os selos de % já vêm
   embutidos nas imagens dos produtos no site original. */
export default function RelatedProducts() {
  return (
    <section className={s.showcase}>
      <div className="bb-container">
        <h2 className={s.showcaseTitulo}>Quem viu, viu também</h2>
        <div className={s.produtos}>
          {relateds.map((p) => (
            <div key={p.title} className={s.prod}>
              <article className={s.prodItem}>
                <span className={s.prodFoto}>
                  <span className={s.prodImg}>
                    <Image src={p.img} alt={p.title} width={341} height={290} sizes="(max-width: 767px) 100vw, (max-width: 991px) 48vw, 341px" loading="lazy" />
                  </span>
                </span>
                <div className={s.prodWish} aria-hidden><HeartIcon width={23} height={18} /></div>

                <div className={s.prodTitulo}><h3>{p.title}</h3></div>
                <div className={s.prodValor}>
                  <p className={s.prodValorDe}>de <s>{p.de}</s> por</p>
                  <p className={s.prodValorFinal}>{p.por}</p>
                </div>
                <div className={s.prodParcelamento}>
                  <p>{p.parcelas}</p>
                  <p>{p.boleto}</p>
                  <p>{p.pix}</p>
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
