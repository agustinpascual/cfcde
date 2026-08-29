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
            <div data-secao="galeria" style={{ display: "contents" }}><ProductGallery /></div>
            <div data-secao="compra" style={{ display: "contents" }}><ProductInfo /></div>

            <div style={{ width: "100%" }}>
              <div data-secao="criadores" style={{ display: "contents" }}><CreatorsSection /></div>
            </div>
            <div data-secao="descricao" style={{ display: "contents" }}><DescriptionCard /></div>
            <div data-secao="avaliacoes" style={{ display: "contents" }}><ReviewsSection /></div>
          </div>
        </div>

        <div className="bb-container"><div data-secao="beneficios" style={{ display: "contents" }}><AlertsStrip /></div></div>
      </main>

      <SiteFooter />
      <FloatingWidgets />
      <PurchaseNotifications />
    </div>
    </StockProvider>
  );
}
