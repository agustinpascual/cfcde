"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { IMG } from "./data";
import { CartIcon, TruckIcon } from "./icons";
import s from "./styles.module.css";

/* header.header — sticky top 0, z-index 12, h90, bg #fff, transition .3s
   Fica "fixed" quando window.scrollY passa a barra de contagem (54px).
   Só a logo (centralizada) e os ícones de pedido/carrinho — as categorias
   foram removidas. */
export default function SiteHeader() {
  const [fixed, setFixed] = useState(false);

  useEffect(() => {
    const onScroll = () => setFixed(window.scrollY > 54);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={s.header} data-fixed={fixed}>
      <div className={`bb-container ${s.headerInner}`}>
        <div className={s.headerVazio} aria-hidden />

        <div className={s.logo}>
          <Link href="/" title="Bela Gummy — Bela Blue Beauty">
            <Image src={`${IMG}/00-comprar-bela-power-black-prazo-e.png`} alt="Bela Blue Beauty" width={114} height={67} priority sizes="114px" />
          </Link>
        </div>

        <div className={s.headerIcons}>
          <span aria-label="Rastrear pedido"><TruckIcon /></span>
          <span aria-label="Carrinho"><CartIcon /><em className={s.cartCount}>(0)</em></span>
        </div>
      </div>
    </header>
  );
}
