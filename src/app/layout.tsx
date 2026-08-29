import type { Metadata } from "next";
import { Instrument_Sans, Lato } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Comprar Mounja Gummy - Suplemento alimentar em gomas - R$89,90",
  description:
    "Mounja Gummy — suplemento alimentar da Bela Blue Beauty em gomas mastigáveis. Linha Gummy: praticidade para manter a suplementação em dia, sem água e sem preparo. Kits com até 44% de desconto.",
  icons: {
    icon: "/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/images/favicon-source.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${instrumentSans.variable} ${lato.variable}`}>{children}</body>
    </html>
  );
}
