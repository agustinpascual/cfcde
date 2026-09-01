import { AnnouncementBar } from "@/components/nodentec/AnnouncementBar";
import { ProductPurchaseSection } from "@/components/nodentec/ProductPurchaseSection";
import { ProductDescription } from "@/components/nodentec/ProductDescription";
import { ReviewsSection } from "@/components/nodentec/ReviewsSection";
import { SiteHeader } from "@/components/nodentec/SiteHeader";
import PurchaseNotifications from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/PurchaseNotifications";

export default function Page() {
  return <div className="nodentec-page"><AnnouncementBar/><SiteHeader/><main><ProductPurchaseSection/><ProductDescription/><ReviewsSection/></main><section className="nodentec-confidence"><article><strong>Frete grátis</strong><span>para todo o Brasil</span></article><article><strong>Compra segura</strong><span>ambiente protegido</span></article><article><strong>Suporte especializado</strong><span>antes e depois da compra</span></article></section><footer className="nodentec-footer"><strong>NodenTec</strong><p>Tecnologia para aplicações institucionais autorizadas.</p><small>© 2026 NodenTec · Uso sujeito à regulamentação aplicável.</small></footer><PurchaseNotifications/></div>;
}
