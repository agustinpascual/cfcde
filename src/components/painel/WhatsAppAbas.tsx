import Link from "next/link";
import w from "./whatsapp.module.css";

const ABAS = [
  { id: "conversas", rotulo: "Conversas", href: "/ioh3j4ciof3n3oic/whatsapp/conversas" },
  { id: "recuperacao", rotulo: "Recuperação", href: "/ioh3j4ciof3n3oic/whatsapp" },
  { id: "treinamento", rotulo: "Treinamento", href: "/ioh3j4ciof3n3oic/whatsapp/treinamento" },
] as const;

export default function WhatsAppAbas({ atual }: { atual: (typeof ABAS)[number]["id"] }) {
  return (
    <nav className={w.subAbas} aria-label="Seções do WhatsApp">
      {ABAS.map((aba) => (
        <Link
          key={aba.id}
          href={aba.href}
          className={aba.id === atual ? w.subAbaAtiva : w.subAba}
          aria-current={aba.id === atual ? "page" : undefined}
        >
          {aba.rotulo}
        </Link>
      ))}
    </nav>
  );
}
