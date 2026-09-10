import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AcoesRecuperacaoCarrinho from "@/components/painel/AcoesRecuperacaoCarrinho";
import Casca from "@/components/painel/Casca";
import { lerAoVivo, lerCarrinhoAbandonado, moeda, rotuloDispositivo } from "@/components/painel/dados";
import { criarTokenRecuperacaoCarrinho } from "@/lib/carrinho-recuperacao";
import { autenticado, painelConfigurado } from "@/lib/painel-auth";
import s from "@/components/painel/painel.module.css";
import d from "@/components/painel/pedido.module.css";
import c from "@/components/painel/carrinho-abandonado.module.css";

export const metadata: Metadata = { title: "Carrinho abandonado", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const quando = (iso: string | null) => iso ? new Date(iso).toLocaleString("pt-BR", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  timeZone: "America/Sao_Paulo",
}) : "—";

const documento = (valor: string | null) => {
  const n = (valor ?? "").replace(/\D/g, "");
  if (n.length === 11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (n.length === 14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return valor ?? "—";
};

const telefone = (valor: string | null) => {
  const n = (valor ?? "").replace(/\D/g, "");
  return n.length === 10 || n.length === 11
    ? n.replace(/^(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3")
    : valor ?? "—";
};

async function origemAtual() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://cafecomdeusepai.com").replace(/\/$/, "");
  const protocolo = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocolo}://${host}`;
}

export default async function Page({ params }: { params: Promise<{ sessao: string }> }) {
  if (!painelConfigurado()) redirect("/painel");
  if (!(await autenticado())) redirect("/painel/entrar");

  const { sessao } = await params;
  const [carrinho, vivos, origem] = await Promise.all([
    lerCarrinhoAbandonado(sessao), lerAoVivo(), origemAtual(),
  ]);
  if (!carrinho) notFound();

  const token = criarTokenRecuperacaoCarrinho(carrinho.sessao);
  const link = token ? `${origem}/checkout/recuperar/${encodeURIComponent(token)}` : null;
  const endereco = [
    [carrinho.logradouro, carrinho.numero].filter(Boolean).join(", "),
    carrinho.complemento,
    carrinho.bairro,
    [carrinho.cidade, carrinho.uf].filter(Boolean).join(" - "),
    carrinho.cep,
  ].filter(Boolean);

  return (
    <Casca atual="/painel/pedidos" titulo={carrinho.nome ?? "Carrinho abandonado"}
      subtitulo={`Última atividade em ${quando(carrinho.atualizado_em)}`} aoVivo={vivos.length}>
      <p className={d.voltar}><Link href="/painel/pedidos/abandonados">← Voltar para carrinhos abandonados</Link></p>

      <section className={`${s.cartao} ${c.recuperacao}`}>
        <div className={c.recuperacaoCabecalho}>
          <div>
            <p className={c.sobretitulo}>Recuperar venda</p>
            <h2>Checkout pronto para continuar</h2>
            <p>Envie o link abaixo: os produtos e os dados já informados serão restaurados.</p>
          </div>
          <span className={`${s.selo} ${s.seloPendente}`}>{carrinho.etapa}</span>
        </div>
        <AcoesRecuperacaoCarrinho link={link} telefone={carrinho.telefone} nome={carrinho.nome} />
      </section>

      <div className={d.grade}>
        <section className={`${s.cartao} ${d.bloco}`}>
          <h2 className={d.titulo}>Cliente</h2>
          <dl className={d.campos}>
            <div><dt>Nome</dt><dd>{carrinho.nome ?? "—"}</dd></div>
            <div><dt>E-mail</dt><dd className={s.mono}>{carrinho.email ?? "—"}</dd></div>
            <div><dt>CPF/CNPJ</dt><dd className={s.mono}>{documento(carrinho.documento)}</dd></div>
            <div><dt>Celular</dt><dd className={s.mono}>{telefone(carrinho.telefone)}</dd></div>
          </dl>
        </section>

        <section className={`${s.cartao} ${d.bloco}`}>
          <h2 className={d.titulo}>Entrega</h2>
          {endereco.length ? <address className={d.endereco}>{endereco.map((linha) => <span key={linha}>{linha}</span>)}</address>
            : <p className={d.vazio}>Endereço ainda não informado.</p>}
          <p className={d.frete}>Frete: {carrinho.frete_tipo?.toUpperCase() ?? "não escolhido"}</p>
        </section>

        <section className={`${s.cartao} ${d.bloco}`}>
          <h2 className={d.titulo}>Carrinho</h2>
          <dl className={d.campos}>
            <div><dt>Produto</dt><dd>{carrinho.produto_nome ?? carrinho.produto ?? "—"}</dd></div>
            <div><dt>Valor estimado</dt><dd><strong>{carrinho.valor !== null ? moeda(carrinho.valor) : "—"}</strong></dd></div>
            <div><dt>Pagamento selecionado</dt><dd>{carrinho.metodo_pagamento === "card" ? "Cartão" : carrinho.metodo_pagamento === "pix" ? "PIX" : "—"}</dd></div>
            <div><dt>Cupom</dt><dd>{carrinho.cupom ?? "—"}</dd></div>
            <div><dt>Etapa</dt><dd>{carrinho.etapa}</dd></div>
          </dl>
        </section>

        <section className={`${s.cartao} ${d.bloco}`}>
          <h2 className={d.titulo}>Origem e sessão</h2>
          <dl className={d.campos}>
            <div><dt>Dispositivo</dt><dd>{rotuloDispositivo(carrinho.dispositivo)}</dd></div>
            <div><dt>Localização</dt><dd>{[carrinho.cidade, carrinho.uf, carrinho.pais].filter(Boolean).join(" · ") || "—"}</dd></div>
            <div><dt>Página</dt><dd className={s.mono}>{carrinho.pagina ?? "—"}</dd></div>
            <div><dt>Referência</dt><dd className={s.mono}>{carrinho.referencia ?? "—"}</dd></div>
            <div><dt>IP</dt><dd className={s.mono}>{carrinho.ip ?? "—"}</dd></div>
            <div><dt>Primeiro acesso</dt><dd>{quando(carrinho.sessao_criada_em)}</dd></div>
            <div><dt>Última visita</dt><dd>{quando(carrinho.ultima_visita_em)}</dd></div>
            <div><dt>ID da sessão</dt><dd className={s.mono}>{carrinho.sessao}</dd></div>
          </dl>
        </section>
      </div>
    </Casca>
  );
}
