import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Imprimir from "@/components/painel/Imprimir";
import { lerPedido, moeda } from "@/components/painel/dados";
import { ler } from "@/lib/config-integracoes";
import { autenticado, painelConfigurado } from "@/lib/painel-auth";
import { formatarDataHoraBrasilia } from "@/lib/data-brasilia";
import s from "@/components/painel/recibo.module.css";

export const metadata: Metadata = { title: "Recibo", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const data = (v?: string | null) =>
  v ? formatarDataHoraBrasilia(v, { year: "2-digit" }) : "—";

const PAGAMENTO: Record<string, string> = {
  pix: "PIX", cartao: "Cartão de crédito", cartao_sandbox: "Cartão (teste)",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  if (!painelConfigurado()) redirect("/painel");
  if (!(await autenticado())) redirect("/painel/entrar");

  const { id } = await params;
  const [pedido, razao, cnpj, ie, endereco, telefone, logo] = await Promise.all([
    lerPedido(id),
    ler("EMPRESA_RAZAO_SOCIAL"), ler("EMPRESA_CNPJ"), ler("EMPRESA_IE"),
    ler("EMPRESA_ENDERECO"), ler("EMPRESA_TELEFONE"), ler("EMPRESA_LOGO"),
  ]);
  if (!pedido) notFound();

  const e = pedido.endereco;
  const enderecoCliente = e
    ? [
        [e.logradouro, e.numero].filter(Boolean).join(", "),
        e.complemento, e.bairro,
        [e.localidade, e.uf].filter(Boolean).join(" - "),
        e.cep && `CEP ${e.cep}`,
      ].filter(Boolean).join(" · ")
    : "—";

  const qtd = pedido.quantidade ?? 1;
  const unitario = qtd > 0 ? (pedido.subtotal_centavos || pedido.valor_centavos) / qtd : 0;
  const acrescimoCartao = pedido.metodo_pagamento === "cartao"
    ? Math.max(0, pedido.valor_centavos - (pedido.subtotal_centavos - pedido.desconto_centavos + pedido.frete_centavos))
    : 0;

  return (
    <div className={s.tela}>
      <div className={s.barra}>
        <Link href={`/painel/pedidos/${id}`} className={s.voltar}>← Voltar ao pedido</Link>
        <Imprimir className={s.imprimir} />
      </div>

      <article className={s.folha}>
        <header className={s.topo}>
          {logo && <Image className={s.logo} src={logo} alt="" width={74} height={83} unoptimized />}
          <div className={s.emitente}>
            <p className={s.razao}>{razao || "Configure a razão social em Integrações"}</p>
            {cnpj && <p className={s.emitenteLinha}>CNPJ {cnpj}{ie ? ` · IE ${ie}` : " · Isento de IE"}</p>}
            {endereco && <p className={s.emitenteLinha}>{endereco}</p>}
            {telefone && <p className={s.emitenteLinha}>{telefone}</p>}
          </div>
          <div className={s.selo}>
            <p className={s.seloTitulo}>RECIBO DE COMPRA</p>
            <p className={s.seloNumero}>Nº {pedido.referencia}</p>
            <p className={s.seloData}>Emitido em {data(new Date().toISOString())}</p>
          </div>
        </header>

        <section className={s.secao}>
          <h2 className={s.secaoTitulo}>Comprador</h2>
          <div className={s.grade}>
            <div className={`${s.campo} ${s.campoLargo}`}>
              <p className={s.rotulo}>Nome</p>
              <p className={s.valor}>{pedido.cliente_nome || "—"}</p>
            </div>
            <div className={s.campo}>
              <p className={s.rotulo}>CPF / CNPJ</p>
              <p className={s.valor}>{pedido.cliente_documento || "—"}</p>
            </div>
            <div className={`${s.campo} ${s.campoLargo}`}>
              <p className={s.rotulo}>E-mail</p>
              <p className={s.valor}>{pedido.cliente_email || "—"}</p>
            </div>
            <div className={s.campo}>
              <p className={s.rotulo}>Telefone</p>
              <p className={s.valor}>{pedido.cliente_telefone || "—"}</p>
            </div>
            <div className={`${s.campo} ${s.campoLargo}`} style={{ gridColumn: "span 3" }}>
              <p className={s.rotulo}>Endereço de entrega</p>
              <p className={s.valor}>{enderecoCliente}</p>
            </div>
          </div>
        </section>

        <section className={s.secao}>
          <h2 className={s.secaoTitulo}>Produtos</h2>
          <table className={s.tabela}>
            <thead>
              <tr>
                <th>Descrição</th>
                <th className={s.num}>Qtde</th>
                <th className={s.num}>Valor unitário</th>
                <th className={s.num}>Valor total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{pedido.kit || "Produto"}</td>
                <td className={s.num}>{qtd}</td>
                <td className={s.num}>{moeda(unitario)}</td>
                <td className={s.num}>{moeda(pedido.subtotal_centavos || pedido.valor_centavos)}</td>
              </tr>
            </tbody>
          </table>

          <div className={s.totais}>
            <div className={s.linhaTotal}>
              <span>Subtotal</span><strong>{moeda(pedido.subtotal_centavos || pedido.valor_centavos)}</strong>
            </div>
            {pedido.desconto_centavos > 0 && (
              <div className={s.linhaTotal}>
                <span>Desconto</span><strong>− {moeda(pedido.desconto_centavos)}</strong>
              </div>
            )}
            <div className={s.linhaTotal}>
              <span>Frete{pedido.frete_tipo ? ` (${pedido.frete_tipo})` : ""}</span>
              <strong>{pedido.frete_centavos > 0 ? moeda(pedido.frete_centavos) : "Grátis"}</strong>
            </div>
            {acrescimoCartao > 0 && (
              <div className={s.linhaTotal}>
                <span>Juros do parcelamento</span><strong>+ {moeda(acrescimoCartao)}</strong>
              </div>
            )}
            <div className={s.totalFinal}>
              <span>Total pago</span><strong>{moeda(pedido.valor_centavos)}</strong>
            </div>
          </div>
        </section>

        <section className={s.secao}>
          <h2 className={s.secaoTitulo}>Pagamento</h2>
          <div className={s.grade}>
            <div className={s.campo}>
              <p className={s.rotulo}>Forma</p>
              <p className={s.valor}>{PAGAMENTO[pedido.metodo_pagamento ?? ""] ?? pedido.metodo_pagamento ?? "—"}</p>
            </div>
            <div className={s.campo}>
              <p className={s.rotulo}>Pedido feito em</p>
              <p className={s.valor}>{data(pedido.criado_em)}</p>
            </div>
            <div className={s.campo}>
              <p className={s.rotulo}>Pagamento confirmado em</p>
              <p className={s.valor}>{data(pedido.pago_em)}</p>
            </div>
          </div>
        </section>

        {/* Dizer o que este documento NÃO é evita que o cliente o apresente
            como nota fiscal e leve um problema junto. */}
        <p className={s.rodape}>
          Este documento é um comprovante de compra emitido pelo vendedor. Não é
          documento fiscal e não substitui a Nota Fiscal Eletrônica (NF-e), que,
          quando emitida, é enviada separadamente.
        </p>
      </article>
    </div>
  );
}
