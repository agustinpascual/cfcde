import Image from "next/image";
import Link from "next/link";
import MenuMobile from "./MenuMobile";
import { IconeBanco, IconeChat, IconePedidos, IconePlug, IconeVendas } from "./Icones";
import { marca } from "@/components/storefront/brand";
import s from "./painel.module.css";

const ITENS = [
  { grupo: "Operação", links: [
    { href: "/ioh3j4ciof3n3oic", rotulo: "Dashboard", Icone: IconeVendas, vivo: true },
    { href: "/ioh3j4ciof3n3oic/pedidos", rotulo: "Pedidos", Icone: IconePedidos },
  ]},
  { grupo: "Configuração", links: [
    { href: "/ioh3j4ciof3n3oic/integracoes", rotulo: "Integrações", Icone: IconePlug },
    { href: "/ioh3j4ciof3n3oic/whatsapp", rotulo: "WhatsApp", Icone: IconeChat },
    { href: "/ioh3j4ciof3n3oic/instalar", rotulo: "Instalação", Icone: IconeBanco },
  ]},
];

export default function Casca({ atual, titulo, subtitulo, aoVivo = 0, children }: {
  atual: string; titulo: string; subtitulo?: string; aoVivo?: number; children: React.ReactNode;
}) {
  return (
    <div className={s.app}>
      <MenuMobile>
      <nav className={s.lateral} aria-label="Navegação do painel">
        <Link href="/ioh3j4ciof3n3oic" className={s.marca}>
          {/* O logo é preto com o "fé" em cobre: sobre a barra escura sumiria,
              e inverter as cores mataria o cobre. Vai numa placa creme — que é
              a combinação da própria marca. Proporção real 665×748. */}
          {marca.logo ? (
            <span className={s.marcaPlaca}>
              <Image src={marca.logo} alt={marca.nome} width={40} height={45}
                className={s.marcaLogo} priority />
            </span>
          ) : (
            <p className={s.marcaNome}>{marca.nome}</p>
          )}
          <p className={s.marcaSub}>Painel administrativo</p>
        </Link>

        <div className={s.menu}>
          {ITENS.map((g) => (
            <div key={g.grupo}>
              <p className={s.grupo}>{g.grupo}</p>
              {g.links.map(({ href, rotulo, Icone, vivo }) => (
                <Link key={href} href={href} aria-current={atual === href ? "page" : undefined} className={`${s.link} ${atual === href ? s.linkAtivo : ""}`}>
                  <Icone /> {rotulo}
                  {vivo && aoVivo > 0 && <span className={s.badgeVivo}>{aoVivo}</span>}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className={s.rodapeLateral}>
          <form action="/ioh3j4ciof3n3oic/sair" method="post">
            <button type="submit" className={s.sair}>Sair</button>
          </form>
          <p>Dados em tempo real do Supabase</p>
        </div>
      </nav>
      </MenuMobile>

      <div className={s.conteudo}>
        <header className={s.cabecalho}>
          <div>
            <h1 className={s.titulo}>{titulo}</h1>
            {subtitulo && <p className={s.subtitulo}>{subtitulo}</p>}
          </div>
        </header>
        <main className={s.corpo}>{children}</main>
      </div>
    </div>
  );
}
