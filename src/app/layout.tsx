import type { Metadata } from "next";
import { Instrument_Sans, Lato } from "next/font/google";
import { Suspense } from "react";
import Rastreador from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/Rastreador";
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

/* Domínio público. Serve de base para URLs absolutas (Open Graph, canonical).
   É secundário até o domínio próprio ser apontado — troque a env quando for. */
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bella-gummy.vercel.app";
const OG_IMG = "/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/images/imag1.png";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "Gummys - Suplemento Alimentar em goma",
    template: "%s | Bela Blue Beauty",
  },
  description:
    "Bela Gummy: suplemento alimentar em gomas mastigáveis da Bela Blue Beauty. Prático de tomar, sem água e sem preparo. Kits com até 44% de desconto, 5% off no PIX e frete grátis para todo o Brasil.",
  applicationName: "Bela Blue Beauty",
  keywords: [
    "suplemento alimentar em goma",
    "gummy suplemento",
    "goma mastigável suplemento",
    "suplemento em gomas",
    "Bela Blue Beauty",
    "comprar suplemento em goma",
  ],
  authors: [{ name: "Bela Blue Beauty" }],
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "Bela Blue Beauty",
    title: "Gummys - Suplemento Alimentar em goma",
    description:
      "Suplemento alimentar em gomas mastigáveis. Sem água, sem preparo. Kits com até 44% de desconto e frete grátis para todo o Brasil.",
    images: [{ url: OG_IMG, width: 1200, height: 1200, alt: "Bela Gummy — suplemento alimentar em gomas" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gummys - Suplemento Alimentar em goma",
    description: "Suplemento alimentar em gomas mastigáveis, com kits de até 44% de desconto.",
    images: [OG_IMG],
  },
  icons: {
    icon: "/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/images/favicon-source.png",
  },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${instrumentSans.variable} ${lato.variable}`}>
        {children}
        <Suspense fallback={null}><Rastreador /></Suspense>
      </body>
    </html>
  );
}
