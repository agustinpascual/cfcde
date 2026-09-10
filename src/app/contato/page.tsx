import type { Metadata } from "next";
import PaginaInstitucional from "@/components/sites/cafecomdeuspai-com-8456844d/institucional/PaginaInstitucional";
import s from "@/components/sites/cafecomdeuspai-com-8456844d/institucional/pagina.module.css";
import { RASTREIO_BASE } from "@/lib/rastreio";
import { metadadosPagina } from "@/lib/seo";

export const metadata: Metadata = metadadosPagina({
  titulo: "Fale conosco — Café com Deus Pai",
  descricao: "Canais de atendimento da loja oficial Café com Deus Pai.",
  caminho: "/contato",
});

export default function Page() {
  return (
    <PaginaInstitucional titulo="Fale conosco" subtitulo="Precisa de ajuda com uma compra, entrega ou produto? Fale com nosso atendimento.">
      <div className={s.highlight}>
        <h2>Central de atendimento</h2>
        <p>Tenha em mãos o número do pedido e o e-mail usado na compra para agilizar a consulta.</p>
        <p><strong>SAC: (47) 92005-7518</strong></p>
        <div className={s.actions}>
          <a className={s.button} href="https://wa.me/5547920057518" target="_blank" rel="noopener noreferrer">Falar pelo WhatsApp</a>
          <a className={`${s.button} ${s.buttonSecondary}`} href={RASTREIO_BASE} target="_blank" rel="noopener noreferrer">Rastrear pedido</a>
        </div>
      </div>
      <h2>Antes de entrar em contato</h2>
      <p>O código de rastreamento é enviado ao e-mail informado no checkout depois que o pedido é despachado. Confira também as pastas de spam e lixeira.</p>
    </PaginaInstitucional>
  );
}
