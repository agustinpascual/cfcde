import Link from "next/link";
import { IconeChat, IconePedidos, IconePlug, IconeVendas, IconeVivo } from "./Icones";
import s from "./painel.module.css";

const ITENS = [
  { grupo: "Operação", links: [
    { href: "/painel", rotulo: "Vendas", Icone: IconeVendas },
    { href: "/painel/ao-vivo", rotulo: "Ao vivo", Icone: IconeVivo, vivo: true },
    { href: "/painel/pedidos", rotulo: "Pedidos", Icone: IconePedidos },
  ]},
  { grupo: "Configuração", links: [
    { href: "/painel/integracoes", rotulo: "Integrações", Icone: IconePlug },
    { href: "/painel/whatsapp", rotulo: "WhatsApp", Icone: IconeChat },
  ]},
];

export default function Casca({ atual, titulo, subtitulo, aoVivo = 0, children }: {
  atual: string; titulo: string; subtitulo?: string; aoVivo?: number; children: React.ReactNode;
}) {
  return (
    <div className={s.app}>
      <nav className={s.lateral}>
        <div className={s.marca}>
          <p className={s.marcaNome}>Bela Blue Beauty</p>
          <p className={s.marcaSub}>Painel administrativo</p>
        </div>

        <div className={s.menu}>
          {ITENS.map((g) => (
            <div key={g.grupo}>
              <p className={s.grupo}>{g.grupo}</p>
              {g.links.map(({ href, rotulo, Icone, vivo }) => (
                <Link key={href} href={href} className={`${s.link} ${atual === href ? s.linkAtivo : ""}`}>
                  <Icone /> {rotulo}
                  {vivo && aoVivo > 0 && <span className={s.badgeVivo}>{aoVivo}</span>}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className={s.rodapeLateral}>
          <a href="/painel/sair" className={s.sair}>Sair</a>
          <p>Dados em tempo real do Supabase</p>
        </div>
      </nav>

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
