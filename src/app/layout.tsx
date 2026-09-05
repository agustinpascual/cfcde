import type { Metadata } from "next";
import { Instrument_Sans, Inter, Lato, Work_Sans } from "next/font/google";
import { Suspense } from "react";
import Rastreador from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/Rastreador";
import SplashScreen from "@/components/sites/cafecomdeuspai-com-8456844d/shared/SplashScreen";
import AntiClone from "@/components/seguranca/AntiClone";
import { marca } from "@/components/storefront/brand";
import { SITE } from "@/lib/seo";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const workSans = Work_Sans({ variable: "--font-work-sans", subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });


/* Preencha com os dados da marca antes de publicar.
   O nome vem de components/storefront/brand.ts — fonte única. */
export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: marca.nome,
    template: `%s | ${marca.nome}`,
  },
  description: marca.tagline,
  applicationName: marca.nome,
  authors: [{ name: marca.nome }],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: marca.nome,
    title: marca.nome,
    description: marca.tagline,
    /* Adicione um PNG 1200x630 em /public e referencie aqui. */
  },
  twitter: {
    card: "summary_large_image",
    title: marca.nome,
    description: marca.tagline,
  },
  /* Ícones: src/app/favicon.ico, icon.png e apple-icon.png (convenção do Next). */
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${instrumentSans.variable} ${lato.variable} ${workSans.variable} ${inter.variable}`}>
        {children}
        <SplashScreen />
        <AntiClone />
        <Suspense fallback={null}><Rastreador /></Suspense>
      </body>
    </html>
  );
}
