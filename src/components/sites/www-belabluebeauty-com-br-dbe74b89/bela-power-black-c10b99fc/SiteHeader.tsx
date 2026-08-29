"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { IMG, nav } from "./data";
import { CartIcon, ChevronDown, MenuIcon, TruckIcon } from "./icons";
import s from "./styles.module.css";

/* header.header — sticky top 0, z-index 12, h90, bg #fff, transition .3s
   Fica "fixed" quando window.scrollY passa a barra de contagem (54px).
   Os itens de navegação não levam a lugar nenhum neste clone: são <span>,
   não <a>, para não gerar rota quebrada. */
export default function SiteHeader() {
  const [fixed, setFixed] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    const onScroll = () => setFixed(window.scrollY > 54);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={s.header} data-fixed={fixed}>
      <div className={`bb-container ${s.headerInner}`}>
        <button className={s.menuBtn} aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuAberto} onClick={() => setMenuAberto((v) => !v)}>
          <MenuIcon aberto={menuAberto} />
        </button>

        <div className={s.logo}>
          <Link href="/" title="Bela Gummy — Bela Blue Beauty">
            <Image src={`${IMG}/00-comprar-bela-power-black-prazo-e.png`} alt="Bela Blue Beauty" width={114} height={67} priority sizes="114px" />
          </Link>
        </div>

        <nav className={s.nav}>
          <ul className={s.navList}>
            {nav.map((n) => (
              <li key={n.label}>
                <span className={s.navLink}>
                  {n.label}
                  {n.dropdown && <ChevronDown width={14} height={14} />}
                </span>
              </li>
            ))}
          </ul>
        </nav>

        <div className={s.headerIcons}>
          <span aria-label="Rastrear pedido"><TruckIcon /></span>
          <span aria-label="Carrinho"><CartIcon /><em className={s.cartCount}>(0)</em></span>
        </div>

        {menuAberto && (
          <nav className={s.menuDrawer} aria-label="Menu principal">
            {nav.map((n) => (
              <span key={n.label} onClick={() => setMenuAberto(false)}>{n.label}</span>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
