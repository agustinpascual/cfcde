import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Casca from "@/components/painel/Casca";
import { lerAoVivo, lerPedido, moeda } from "@/components/painel/dados";
import { autenticado, painelConfigurado } from "@/lib/painel-auth";
import s from "@/components/painel/painel.module.css";
import d from "@/components/painel/pedido.module.css";

export const metadata: Metadata = { title: "Pedido", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const SELO: Record<string, string> = {
  aprovado: s.seloAprovado, pendente: s.seloPendente,
  falhou: s.seloFalhou, recusado: s.seloFalhou, expirado: s.seloFalhou, estornado: s.seloNeutro,
};
const ROTULO: Record<string, string> = {
  aprovado: "Pago", pendente: "Aguardando pagamento", falhou: "Falhou",
  recusado: "Recusado", expirado: "Expirado", estornado: "Estornado",
};
const formaPagamento = (metodo: string) => metodo === "cartao_sandbox" ? "Cartão sandbox" : "PIX";
const quando = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  }) : "—";

const doc = (v: string | null) => {
  if (!v) return "—";
  const n = v.replace(/\D/g, "");
  if (n.length === 11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (n.length === 14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return v;
};
const tel = (v: string | null) => {
  if (!v) return "—";
  const n = v.replace(/\D/g, "");
  return n.length >= 10 ? n.replace(/^(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3") : v;
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  if (!painelConfigurado()) redirect("/painel");
  if (!(await autenticado())) redirect("/painel/entrar");

  const { id } = await params;
  const [pedido, vivos] = await Promise.all([lerPedido(id), lerAoVivo()]);
  if (!pedido) notFound();

  const e = pedido.endereco;
  const linhaEndereco = e
    ? [
        [e.logradouro, e.numero].filter(Boolean).join(", "),
        e.complemento,
        e.bairro,
        [e.localidade, e.uf].filter(Boolean).join(" - "),
        e.cep,
      ].filter(Boolean)
    : [];

  return (
    <Casca atual="/painel/pedidos" titulo={pedido.referencia}
      subtitulo={`Criado em ${quando(pedido.criado_em)}`} aoVivo={vivos.length}>
      <p className={d.voltar}>
        <Link href="/painel/pedidos">← Voltar para os pedidos</Link>
      </p>

      <div className={d.topo}>
        <span className={`${s.selo} ${SELO[pedido.status] ?? s.seloNeutro} ${d.seloGrande}`}>
          {ROTULO[pedido.status] ?? pedido.status}
        </span>
        <span className={d.pagamento}>via {formaPagamento(pedido.metodo_pagamento)}</span>
        {pedido.pago_em && <span className={d.pagoEm}>Pago em {quando(pedido.pago_em)}</span>}
      </div>

      <div className={d.grade}>
        <section className={`${s.cartao} ${d.bloco}`}>
          <h2 className={d.titulo}>Cliente</h2>
          <dl className={d.campos}>
            <div><dt>Nome</dt><dd>{pedido.cliente_nome ?? "—"}</dd></div>
            {pedido.metodo_pagamento === "cartao_sandbox" && (
              <>
                <div><dt>Nome no cartão</dt><dd>{pedido.cartao_titular ?? "—"}</dd></div>
                <div><dt>Cartão sandbox</dt><dd className={s.mono}>
                  {pedido.cartao_inicio && pedido.cartao_final
                    ? `${pedido.cartao_inicio} •••• •••• ${pedido.cartao_final}`
                    : pedido.cartao_final ? `•••• •••• •••• ${pedido.cartao_final}` : "—"}
                </dd></div>
                <div><dt>Bandeira</dt><dd>{pedido.cartao_bandeira ?? "—"}</dd></div>
              </>
            )}
            <div><dt>E-mail</dt><dd className={s.mono}>{pedido.cliente_email ?? "—"}</dd></div>
            <div><dt>CPF/CNPJ</dt><dd className={s.mono}>{doc(pedido.cliente_documento)}</dd></div>
            <div><dt>Celular</dt><dd className={s.mono}>{tel(pedido.cliente_telefone)}</dd></div>
          </dl>
        </section>

        <section className={`${s.cartao} ${d.bloco}`}>
          <h2 className={d.titulo}>Entrega</h2>
          {linhaEndereco.length ? (
            <address className={d.endereco}>
              {linhaEndereco.map((l) => <span key={l}>{l}</span>)}
            </address>
          ) : (
            <p className={d.vazio}>Endereço não informado.</p>
          )}
          {pedido.frete_tipo && <p className={d.frete}>{pedido.frete_tipo}</p>}
        </section>

        <section className={`${s.cartao} ${d.bloco} ${d.blocoLargo}`}>
          <h2 className={d.titulo}>Produto e valores</h2>
          <div className={d.item}>
            <span className={d.itemNome}>
              {pedido.kit ?? "—"}
              {pedido.quantidade > 1 && <em className={d.qtd}>× {pedido.quantidade}</em>}
            </span>
            <span className={d.itemValor}>{moeda(pedido.subtotal_centavos)}</span>
          </div>

          <dl className={d.valores}>
            <div><dt>Subtotal</dt><dd>{moeda(pedido.subtotal_centavos)}</dd></div>
            {pedido.desconto_centavos > 0 && (
              <div className={d.desconto}><dt>Desconto (PIX 5%)</dt><dd>−{moeda(pedido.desconto_centavos)}</dd></div>
            )}
            <div>
              <dt>Frete</dt>
              <dd>{pedido.frete_centavos === 0 ? "Grátis" : moeda(pedido.frete_centavos)}</dd>
            </div>
            <div className={d.total}>
              <dt>{pedido.status === "aprovado" ? "Valor pago" : "Total"}</dt>
              <dd>{moeda(pedido.valor_centavos)}</dd>
            </div>
          </dl>

          {pedido.pix_id && (
            <p className={d.pixId}>Cobrança PinPay: <code>{pedido.pix_id}</code></p>
          )}
        </section>
      </div>
    </Casca>
  );
}
