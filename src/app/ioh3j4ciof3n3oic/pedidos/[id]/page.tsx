import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Casca from "@/components/painel/Casca";
import FormRastreio from "@/components/painel/FormRastreio";
import JornadaCliente from "@/components/painel/JornadaCliente";
import OrigemPedido from "@/components/painel/OrigemPedido";
import PixCobranca from "@/components/painel/PixCobranca";
import Recarrega from "@/components/painel/Recarrega";
import { ipBloqueado, lerAoVivo, lerJornada, lerPedido, moeda, rotuloDispositivo } from "@/components/painel/dados";
import { autenticado, painelConfigurado } from "@/lib/painel-auth";
import { ler } from "@/lib/config-integracoes";
import { escolherModeloRecuperacao, MENSAGEM_PIX_PADRAO, modelosRecuperacao } from "@/lib/mensagens-recuperacao";
import { formatarDataHoraBrasilia } from "@/lib/data-brasilia";
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
const formaPagamento = (metodo: string) => metodo === "cartao" ? "Cartão · AxxonPay" : metodo === "cartao_sandbox" ? "Cartão sandbox" : "PIX";
const quando = (iso: string | null) =>
  iso ? formatarDataHoraBrasilia(iso) : "—";

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
  if (!painelConfigurado()) redirect("/ioh3j4ciof3n3oic");
  if (!(await autenticado())) redirect("/ioh3j4ciof3n3oic/entrar");

  const { id } = await params;
  const [pedido, vivos, modeloPix] = await Promise.all([
    lerPedido(id), lerAoVivo(), ler("WHATSAPP_MSG_PIX_PENDENTE"),
  ]);
  if (!pedido) notFound();

  const jornada = await lerJornada(pedido.referencia);
  const ipOrigem = jornada.sessao?.ip ?? null;
  const ipJaBloqueado = await ipBloqueado(ipOrigem);
  const acrescimoCartao = pedido.metodo_pagamento === "cartao"
    ? Math.max(0, pedido.valor_centavos - (pedido.subtotal_centavos - pedido.desconto_centavos + pedido.frete_centavos))
    : 0;

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
    <Casca atual="/ioh3j4ciof3n3oic/pedidos" titulo={pedido.referencia}
      subtitulo={`Criado em ${quando(pedido.criado_em)}`} aoVivo={vivos.length}>
      {pedido.metodo_pagamento === "pix" && <Recarrega segundos={5} />}
      <p className={d.voltar}>
        <Link href="/ioh3j4ciof3n3oic/pedidos">← Voltar para os pedidos</Link>
        <Link href={`/ioh3j4ciof3n3oic/pedidos/${id}/recibo`} className={d.linkRecibo}>Recibo de compra</Link>
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
          <FormRastreio pedidoId={id} atual={pedido.codigo_rastreio ?? null} />
        </section>

        <section className={`${s.cartao} ${d.bloco} ${pedido.metodo_pagamento !== "pix" ? d.blocoLargo : ""}`}>
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
              <div className={d.desconto}><dt>Desconto</dt><dd>−{moeda(pedido.desconto_centavos)}</dd></div>
            )}
            <div>
              <dt>Frete</dt>
              <dd>{pedido.frete_centavos === 0 ? "Grátis" : moeda(pedido.frete_centavos)}</dd>
            </div>
            {acrescimoCartao > 0 && (
              <div><dt>Juros do parcelamento</dt><dd>+{moeda(acrescimoCartao)}</dd></div>
            )}
            <div className={d.total}>
              <dt>{pedido.status === "aprovado" ? "Valor pago" : "Total"}</dt>
              <dd>{moeda(pedido.valor_centavos)}</dd>
            </div>
          </dl>

          {pedido.metodo_pagamento !== "pix" && pedido.pix_id && (
            <p className={d.pixId}>Cobrança PinPay: <code>{pedido.pix_id}</code></p>
          )}
        </section>

        {pedido.metodo_pagamento === "pix" && (
          <section className={`${s.cartao} ${d.bloco} ${d.pixPagamento}`}>
            <div className={d.pixCabecalho}>
              <div>
                <p className={d.pixSobre}>Pagamento PIX</p>
                <h2>QR Code e copia e cola</h2>
                <p>Confira a cobrança ou copie o código para o cliente.</p>
              </div>
            </div>
            {pedido.pix_copia_cola ? (
              <PixCobranca copiaCola={pedido.pix_copia_cola} qrUrl={pedido.pix_qr_url}
                telefone={pedido.status === "pendente" ? pedido.cliente_telefone : null}
                nome={pedido.cliente_nome} pedido={pedido.referencia} valor={moeda(pedido.valor_centavos)}
                modelo={escolherModeloRecuperacao(modelosRecuperacao(modeloPix, MENSAGEM_PIX_PADRAO), pedido.referencia)} />
            ) : (
              <p className={d.pixIndisponivel}>
                O QR Code não foi armazenado neste pedido antigo.
              </p>
            )}
            {pedido.pix_id && (
              <p className={d.pixId}>Cobrança PinPay: <code>{pedido.pix_id}</code></p>
            )}
          </section>
        )}

        {jornada.sessao && (
          <OrigemPedido
            dispositivoLabel={rotuloDispositivo(jornada.sessao.dispositivo)}
            ip={ipOrigem}
            cidade={jornada.sessao.cidade}
            uf={jornada.sessao.uf}
            pais={jornada.sessao.pais ?? null}
            bloqueadoInicial={ipJaBloqueado}
          />
        )}

        <JornadaCliente jornada={jornada} />
      </div>
    </Casca>
  );
}
