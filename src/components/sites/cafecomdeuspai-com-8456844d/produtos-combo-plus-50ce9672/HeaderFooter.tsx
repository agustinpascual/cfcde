"use client";

import Image from "next/image";
import {
  ChevronDown,
  Facebook,
  Instagram,
  Menu,
  Search,
  ShoppingBag,
  UserRound,
  X,
  Youtube,
} from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./HeaderFooter.module.css";

const assetRoot =
  "/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672";

const navigation = [
  ["Lançamentos", "/lancamento/"],
  ["Relâmpago", "/relampago/"],
  ["Imperdível", "/ofertas-especiais/"],
  ["Combos", "/combos/"],
  ["Kids/Teens", "/kids-teens/"],
  ["Idiomas", "/idiomas1/"],
  ["Compra Internacional", "https://lp.cafecomdeuspai.com/amz-paises"],
] as const;

const footerColumns = [
  {
    title: "Atendimento",
    links: [
      ["Fale conosco", "/fale-conosco/"],
      ["Compras em atacado", "/compras-em-atacado/"],
      ["Assessoria de imprensa", "/assessoria-de-imprensa/"],
      ["Dúvidas frequentes", "/duvidas-frequentes/"],
    ],
  },
  {
    title: "Institucional",
    links: [
      ["Depoimentos", "https://lp.cafecomdeuspai.com/depoimentos"],
      ["Sobre nós", "/sobre-nos/"],
      ["Sobre o autor", "/sobre-o-autor/"],
    ],
  },
  {
    title: "Políticas",
    links: [
      ["Trocas e Devoluções", "/trocas-e-devolucoes/"],
      ["Entregas", "/entregas1/"],
      ["Privacidade e segurança", "/politica-de-privacidade/"],
    ],
  },
] as const;

type HeaderProps = {
  cartCount?: number;
  onCartClick?: () => void;
};

export function PromoBar() {
  return (
    <div className={styles.promoBar} role="status">
      Frete grátis por tempo limitado
    </div>
  );
}

export function SiteHeader({ cartCount = 0, onCartClick }: HeaderProps) {
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
    <>
      <PromoBar />
      <header className={styles.header}>
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

          <a className={styles.logoLink} href="/" aria-label="Café com Deus Pai — início">
            <Image
              className={styles.logo}
              src={`${assetRoot}/logo.png`}
              alt="Café com Deus Pai"
              width={663}
              height={746}
              priority
            />
          </a>

          <nav className={styles.desktopNav} aria-label="Navegação principal">
            {navigation.map(([label, href]) => (
              <a key={label} href={href}>
                {label}
              </a>
            ))}
          </nav>

          <div className={styles.utilities}>
            <form className={styles.searchForm} action="/search/" role="search">
              <input name="q" type="search" placeholder="Digite sua pesquisa aqui..." aria-label="Pesquisar" />
              <button type="submit" aria-label="Buscar">
                <Search aria-hidden="true" />
              </button>
            </form>
            <a className={`${styles.iconButton} ${styles.accountButton}`} href="/account/login/" aria-label="Minha conta">
              <UserRound aria-hidden="true" />
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
          <form className={styles.mobileSearch} action="/search/" role="search">
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
            {navigation.map(([label, href]) => (
              <a key={label} href={href} onClick={() => setMenuOpen(false)}>
                {label}<ChevronDown aria-hidden="true" />
              </a>
            ))}
          </nav>
        </aside>
      </div>
    </>
  );
}

function FooterColumn({ column }: { column: (typeof footerColumns)[number] }) {
  return (
    <details className={styles.footerColumn}>
      <summary>{column.title}<ChevronDown aria-hidden="true" /></summary>
      <ul>
        {column.links.map(([label, href]) => <li key={label}><a href={href}>{label}</a></li>)}
      </ul>
    </details>
  );
}

export function SiteFooter() {
  const paymentLogos = [
    ["visa", "Visa"], ["mastercard", "Mastercard"], ["amex", "American Express"],
    ["elo", "Elo"], ["hipercard", "Hipercard"], ["pix", "PIX"],
  ] as const;
  return (
    <footer className={styles.footer}>
      <div className={styles.footerMain}>
        <div className={styles.footerBrand}>
          <a href="/" aria-label="Café com Deus Pai — início">
            <Image src={`${assetRoot}/logo.png`} alt="Café com Deus Pai" width={663} height={746} />
          </a>
          <div className={styles.socials} aria-label="Redes sociais">
            <a href="https://instagram.com/cafecomdeuspai" aria-label="Instagram"><Instagram aria-hidden="true" /></a>
            <a href="https://www.youtube.com/c/JuniorRostirola/videos" aria-label="YouTube"><Youtube aria-hidden="true" /></a>
            <a href="https://www.facebook.com/cafecomdeuspai/" aria-label="Facebook"><Facebook aria-hidden="true" /></a>
          </div>
        </div>
        {footerColumns.map((column) => <FooterColumn key={column.title} column={column} />)}
        <details className={`${styles.footerColumn} ${styles.helpColumn}`}>
          <summary>Dúvidas sobre seus pedidos?<ChevronDown aria-hidden="true" /></summary>
          <div className={styles.helpText}>
            <p><strong>SAC: (47) 3224-9292</strong><br />Resposta por WhatsApp em até <strong>72h úteis</strong>.</p>
            <p><strong>Dica:</strong> não recebeu o código de rastreio?<br />Confira sua <strong>caixa de spam</strong> e <strong>lixeira</strong>.</p>
            <a className={styles.trackingLink} href="https://rastreamento.correios.com.br/app/index.php">Acompanhe o seu pedido</a>
          </div>
        </details>
      </div>

      <div className={styles.legalStrip}>
        <div className={styles.paymentBlock}>
          <strong>Formas de pagamento</strong>
          <div className={styles.payments} aria-label="Formas de pagamento aceitas">
            {paymentLogos.map(([file, label]) => <span key={file}><Image src={`/sites/cafecomdeuspai-com-8456844d/checkout/payment-logos/${file}.png`} alt={label} width={150} height={93} /></span>)}
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
