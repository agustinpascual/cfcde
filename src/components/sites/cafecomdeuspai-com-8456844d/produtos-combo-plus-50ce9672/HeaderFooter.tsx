"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ChevronDown,
  Facebook,
  Instagram,
  Menu,
  PackageSearch,
  Search,
  ShoppingBag,
  X,
  Youtube,
} from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./HeaderFooter.module.css";
import { RASTREIO_BASE } from "@/lib/rastreio";

const assetRoot =
  "/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672";
const whatsappNumber = "5547920057518";

const navigation = [
  /* As três primeiras têm página de seção própria, alimentada pelo catálogo.
     As outras ainda não têm produtos classificados e apontam para a home —
     antes todas davam 404. */
  ["Lançamentos", "/categoria/lancamento"],
  ["Relâmpago", "/"],
  ["Imperdível", "/categoria/imperdivel"],
  ["Combos", "/categoria/destaques"],
  ["Kids/Teens", "/"],
  ["Idiomas", "/"],
  ["Compra Internacional", "https://lp.cafecomdeuspai.com/amz-paises"],
] as const;

const footerColumns = [
  {
    title: "Atendimento",
    links: [
      ["Fale conosco", "/contato"],
      ["Compras em atacado", "/compras-em-atacado"],
      ["Assessoria de imprensa", "/assessoria-de-imprensa"],
      ["Dúvidas frequentes", "/duvidas-frequentes"],
    ],
  },
  {
    title: "Institucional",
    links: [
      ["Depoimentos", "https://lp.cafecomdeuspai.com/depoimentos"],
      ["Sobre nós", "/sobre"],
      ["Sobre o autor", "/sobre-o-autor"],
    ],
  },
  {
    title: "Políticas",
    links: [
      ["Trocas e Devoluções", "/trocas-e-devolucoes"],
      ["Entregas", "/entregas"],
      ["Privacidade e segurança", "/politica-de-privacidade"],
    ],
  },
] as const;

type HeaderProps = {
  cartCount?: number;
  onCartClick?: () => void;
  /** Sobrepõe o cabeçalho ao conteúdo, sem fundo. Usado na home,
      onde ele fica por cima do banner. */
  transparente?: boolean;
};

export function PromoBar() {
  return (
    <div className={styles.promoBar} role="status">
      Frete grátis por tempo limitado
    </div>
  );
}

export function SiteHeader({ cartCount = 0, onCartClick, transparente = false }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  return (
    /* No modo transparente a FAIXA e o cabeçalho sobem juntos como um bloco.
       Sobrepor só o cabeçalho fazia ele cobrir a faixa: no celular o logo
       ficava por cima do texto "FRETE GRÁTIS POR TEMPO LIMITADO". */
    <div className={transparente ? styles.sobreposto : undefined}>
      <PromoBar />
      <header className={`${styles.header} ${transparente ? styles.headerTransparente : ""}`}>
        <div className={styles.headerInner}>
          <button
            className={`${styles.iconButton} ${styles.menuButton}`}
            type="button"
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu aria-hidden="true" />
          </button>

          <Link className={styles.logoLink} href="/" aria-label="Café com Deus Pai — início">
            <Image
              className={styles.logo}
              src={`${assetRoot}/logo.png`}
              alt="Café com Deus Pai"
              width={663}
              height={746}
              sizes="(max-width: 720px) 34px, 51px"
              priority
            />
          </Link>

          <nav className={styles.desktopNav} aria-label="Navegação principal">
            {navigation.map(([label, href]) => href.startsWith("/")
              ? <Link key={label} href={href}>{label}</Link>
              : <a key={label} href={href}>{label}</a>)}
          </nav>

          <div className={styles.utilities}>
            <form className={styles.searchForm} action="/busca" role="search">
              <input name="q" type="search" placeholder="Digite sua pesquisa aqui..." aria-label="Pesquisar" />
              <button type="submit" aria-label="Buscar">
                <Search aria-hidden="true" />
              </button>
            </form>
            <a className={`${styles.iconButton} ${styles.accountButton}`} href={RASTREIO_BASE} target="_blank" rel="noopener noreferrer" aria-label="Rastrear meu pedido">
              <PackageSearch aria-hidden="true" />
            </a>
            <button
              className={`${styles.iconButton} ${styles.mobileSearchButton}`}
              type="button"
              aria-label="Pesquisar"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((open) => !open)}
            >
              <Search aria-hidden="true" />
            </button>
            <button className={styles.iconButton} type="button" aria-label="Abrir sacola" onClick={onCartClick}>
              <ShoppingBag aria-hidden="true" />
              {cartCount > 0 ? <span className={styles.cartCount}>{cartCount}</span> : null}
            </button>
          </div>
        </div>

        {searchOpen ? (
          <form className={styles.mobileSearch} action="/busca" role="search">
            <input autoFocus name="q" type="search" placeholder="O que você está buscando?" aria-label="Pesquisar" />
            <button type="submit" aria-label="Buscar"><Search aria-hidden="true" /></button>
          </form>
        ) : null}
      </header>

      <div className={`${styles.menuOverlay} ${menuOpen ? styles.menuOverlayOpen : ""}`} aria-hidden={!menuOpen} onClick={() => setMenuOpen(false)}>
        <aside className={styles.mobileMenu} aria-label="Menu mobile" onClick={(event) => event.stopPropagation()}>
          <div className={styles.mobileMenuTop}>
            <span>Menu</span>
            <button className={styles.iconButton} type="button" aria-label="Fechar menu" onClick={() => setMenuOpen(false)}>
              <X aria-hidden="true" />
            </button>
          </div>
          <nav>
            {navigation.map(([label, href]) => href.startsWith("/")
              ? <Link key={label} href={href} onClick={() => setMenuOpen(false)}>{label}<ChevronDown aria-hidden="true" /></Link>
              : <a key={label} href={href} onClick={() => setMenuOpen(false)}>{label}<ChevronDown aria-hidden="true" /></a>)}
          </nav>
        </aside>
      </div>
    </div>
  );
}

function FooterColumn({ column }: { column: (typeof footerColumns)[number] }) {
  return (
    <section className={styles.footerColumn}>
      <h2 className={styles.footerTitle}>{column.title}</h2>
      <ul>
        {column.links.map(([label, href]) => <li key={label}>{href.startsWith("/") ? <Link href={href}>{label}</Link> : <a href={href}>{label}</a>}</li>)}
      </ul>
    </section>
  );
}

export function SiteFooter() {
  const paymentLogos = [
    ["visa.png", "Visa"], ["mastercard.png", "Mastercard"], ["amex.webp", "American Express"],
    ["elo.png", "Elo"], ["hipercard.png", "Hipercard"], ["pix.png", "PIX"],
  ] as const;
  return (
    <footer className={styles.footer}>
      <div className={styles.footerMain}>
        <div className={styles.footerBrand}>
          <Link href="/" aria-label="Café com Deus Pai — início">
            <Image src={`${assetRoot}/logo.png`} alt="Café com Deus Pai" width={663} height={746} sizes="(max-width: 720px) 66px, 82px" />
          </Link>
          <div className={styles.socials} aria-label="Redes sociais">
            <a href="https://instagram.com/cafecomdeuspai" aria-label="Instagram"><Instagram aria-hidden="true" /></a>
            <a href="https://www.youtube.com/c/JuniorRostirola/videos" aria-label="YouTube"><Youtube aria-hidden="true" /></a>
            <a href="https://www.facebook.com/cafecomdeuspai/" aria-label="Facebook"><Facebook aria-hidden="true" /></a>
          </div>
        </div>
        {footerColumns.map((column) => <FooterColumn key={column.title} column={column} />)}
        <section className={styles.footerColumn}>
          <h2 className={styles.footerTitle}>Dúvidas sobre seus pedidos?</h2>
          <div className={styles.helpText}>
            <p><strong>SAC: <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer">(47) 92005-7518</a></strong><br />Resposta por WhatsApp em até <strong>72h úteis</strong>.</p>
            <p><strong>Dica:</strong> não recebeu o código de rastreio?<br />Confira sua <strong>caixa de spam</strong> e <strong>lixeira</strong>.</p>
            <a className={styles.trackingLink} href={RASTREIO_BASE} target="_blank" rel="noopener noreferrer">Acompanhe o seu pedido</a>
          </div>
        </section>
      </div>

      <div className={styles.legalStrip}>
        <div className={styles.paymentBlock}>
          <strong>Formas de pagamento</strong>
          <div className={styles.payments} aria-label="Formas de pagamento aceitas">
            {paymentLogos.map(([file, label]) => <span key={file}><Image src={`/sites/cafecomdeuspai-com-8456844d/checkout/payment-logos/${file}`} alt={label} width={150} height={93} /></span>)}
          </div>
        </div>
        <div className={styles.secureBlock}>
          <strong>Compra segura</strong>
          <Image className={styles.secureSeal} src="/sites/cafecomdeuspai-com-8456844d/checkout/payment-logos/compra-segura.png" alt="Compra segura" width={79} height={30} />
        </div>
        <p className={styles.copyright}>Copyright © 2026 Café com Deus Pai - Todos os direitos reservados. Proibida cópia parcial ou total sem autorização do autor.<br />Fotos meramente ilustrativas. Itajaí/SC CEP: 88301-550 | CNPJ: 40316640000120.</p>
      </div>
    </footer>
  );
}

export default function HeaderFooter({ cartCount = 0, onCartClick }: HeaderProps) {
  return <><SiteHeader cartCount={cartCount} onCartClick={onCartClick} /><SiteFooter /></>;
}
