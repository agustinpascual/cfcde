import type { Metadata } from "next";
import { AnnouncementBar } from "@/components/storefront/AnnouncementBar";
import { Header } from "@/components/storefront/Header";
import { HeroCarousel } from "@/components/storefront/HeroCarousel";
import { ProductRail } from "@/components/storefront/ProductRail";
import { BannerDuo } from "@/components/storefront/BannerDuo";
import { AboutBlock } from "@/components/storefront/AboutBlock";
import { Newsletter } from "@/components/storefront/Newsletter";
import { MediaGrid } from "@/components/storefront/MediaGrid";
import { Footer } from "@/components/storefront/Footer";
import { CookieBar } from "@/components/storefront/CookieBar";
import { WhatsAppButton } from "@/components/storefront/WhatsAppButton";
import { CartProvider } from "@/components/storefront/CartContext";
import { CartDrawer } from "@/components/storefront/CartDrawer";
import { produtos } from "@/components/storefront/brand";

/* Rota de visualização da vitrine neutra — estrutura sem marca,
   para avaliar componentes antes de aplicar a identidade real. */
export const metadata: Metadata = {
  title: "Vitrine (estrutura)",
  robots: { index: false, follow: false },
};

export default function VitrinePage() {
  return (
    <CartProvider>
      <div className="sf-root">
        <AnnouncementBar />
        <Header />
        <main>
          <HeroCarousel />
          <ProductRail id="lancamentos" titulo="Lançamentos" produtos={produtos.slice(0, 4)} />
          <BannerDuo />
          <ProductRail id="destaques" titulo="Destaques" produtos={produtos.slice(2, 6)} />
          <AboutBlock />
          <section className="bg-[var(--sf-surface-2)]">
            <ProductRail id="ofertas" titulo="Imperdível" produtos={produtos.slice(0, 3)} />
          </section>
          <Newsletter />
          <MediaGrid />
        </main>
        <Footer />
        <CookieBar />
        <WhatsAppButton />
        <CartDrawer />
      </div>
    </CartProvider>
  );
}
