import Image from "next/image";
import Link from "next/link";
import { IMG, bandeiras, footerColumns } from "./data";
import Newsletter from "./Newsletter";
import s from "./styles.module.css";

export default function SiteFooter() {
  return (
    <footer className={s.footer}>
      <div className="bb-container">
        <Newsletter />

        <div className={s.footerCols}>
          <div className={s.footerLogo}>
            <Image src={`${IMG}/00-comprar-bela-power-black-prazo-e.png`} alt="Bela Blue Beauty" width={130} height={76} sizes="130px" loading="lazy" />
            <div className={s.footerSociais}>
              <Image src={`${IMG}/48-facebook.jpg`} alt="Facebook" width={18} height={18} sizes="18px" loading="lazy" />
              <Image src={`${IMG}/49-instagram.png`} alt="Instagram" width={18} height={18} sizes="18px" loading="lazy" />
            </div>
          </div>

          <div className={s.footerCategorias}>
            <p className={s.footerColTitle}>{footerColumns[0].title}</p>
            <div className={s.footerCategoriasGrid}>
              {footerColumns[0].links.map((l) => <span key={l.label} className={s.footerLink}>{l.label}</span>)}
            </div>
          </div>

          {footerColumns.slice(1).map((col) => (
            <div key={col.title} className={s.footerCol}>
              <p className={s.footerColTitle}>{col.title}</p>
              {col.links.map((l) =>
                l.href
                  ? <Link key={l.label} href={l.href} className={s.footerLink}>{l.label}</Link>
                  : <span key={l.label} className={s.footerLink}>{l.label}</span>
              )}
            </div>
          ))}

        </div>

        <div className={s.footerSelos}>
          <div className={s.footerPagamentos}>
            <span>Formas de Pagamento</span>
            {bandeiras.map((b) => (
              <Image key={b.alt} src={b.img} alt={b.alt} width={b.w} height={24} sizes={`${b.w}px`} loading="lazy" />
            ))}
          </div>

          <div className={s.footerSeguranca}>
            <span>Segurança</span>
            <span className={s.selo}>
              <strong style={{ fontSize: 13 }}>5.0</strong>
              <span style={{ color: "var(--bb-star)" }}>★★★★★</span>
              <span style={{ color: "var(--bb-muted)" }}>1485 avaliações</span>
            </span>
            <Image src={`${IMG}/62-google-safe-browsing.png`} alt="Google Safe Browsing" width={60} height={23} sizes="60px" loading="lazy" />
          </div>
        </div>

        <div className={s.footerPlataforma}>
          <span>Plataforma:</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${IMG}/63-wbuy-lojas-virtuais-solu-o-inte.svg`} alt="wBuy" height={14} loading="lazy" />
        </div>
      </div>
    </footer>
  );
}
