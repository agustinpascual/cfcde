import AlertsStrip from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/AlertsStrip";
import CreatorsSection from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/CreatorsSection";
import DadosEstruturados from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/DadosEstruturados";
import CountdownBar from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/CountdownBar";
import DescriptionCard from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/DescriptionCard";
import FloatingWidgets from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/FloatingWidgets";
import ProductGallery from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/ProductGallery";
import ProductInfo from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/ProductInfo";
import PurchaseNotifications from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/PurchaseNotifications";
import ReviewsSection from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/ReviewsSection";
import SiteFooter from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/SiteFooter";
import SiteHeader from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/SiteHeader";
import { StockProvider } from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/StockContext";
import s from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/styles.module.css";

/* Topologia do original (desktop 1440):
   .top-countdown-message 54 → header 90 (sticky)
   main.main-product-page (overflow hidden):
     .central-product [flex wrap]:
        .cln 840 | .detalhes 560 (sticky top 112) | .info-desc 920 | avaliações 1400
   → section.showcase-relateds → #alerts → footer */
export default function Page() {
  return (
    <StockProvider>
    <DadosEstruturados />
    <div id="geral" className={s.paginaProduto}>
      <CountdownBar />
      <SiteHeader />

      <main style={{ overflow: "hidden" }}>
        <div id="produto">
          <div className={`bb-container ${s.centralProduct}`}>
            <ProductGallery />
            <ProductInfo />

            <div style={{ width: "100%" }}>
              <CreatorsSection />
            </div>
            <DescriptionCard />
            <ReviewsSection />
          </div>
        </div>

        <div className="bb-container"><AlertsStrip /></div>
      </main>

      <SiteFooter />
      <FloatingWidgets />
      <PurchaseNotifications />
    </div>
    </StockProvider>
  );
}
