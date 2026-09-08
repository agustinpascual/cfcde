import "server-only";
import { after } from "next/server";
import { enviarUm } from "./email";
import { criarEncomenda } from "./correios";
import { enviarCompra } from "./meta-capi";
import { emailPedidoAprovado, emailPixGerado, type DadosPedido } from "./emails-modelos";
import { paraBase64, reciboPdf } from "./recibo-pdf";
import { supabaseAdmin } from "./supabase/servidor";
import { sitePublicoEmail } from "./site-email";

/* E-mail de "pagamento confirmado" com o comprovante de venda anexado.

   Roda DEPOIS da resposta do webhook: gerar o PDF e falar com a Resend leva
   segundos, e a PinPay reenvia o evento se demorarmos a responder. */

/** Mantém o trabalho vinculado ao ciclo da requisição, também fora da Cloudflare. */
export function depois(trabalho: Promise<unknown>) {
  const acompanhado = trabalho.catch((e) => console.error("[confirmacao] segundo plano:", (e as Error).message));
  after(() => acompanhado);
}

type Endereco = {
  logradouro?: string; numero?: string; complemento?: string;
  bairro?: string; localidade?: string; uf?: string; cep?: string;
};

const linhaEndereco = (e: Endereco | null) =>
  e ? [
    [e.logradouro, e.numero].filter(Boolean).join(", "),
    e.complemento, e.bairro,
    [e.localidade, e.uf].filter(Boolean).join(" - "),
    e.cep && `CEP ${e.cep}`,
  ].filter(Boolean).join(" · ") : null;

/**
 * Busca o pedido, monta o e-mail e envia com o PDF anexado.
 * Idempotente por desenho: a PinPay reenvia eventos, e mandar o mesmo e-mail
 * duas vezes irrita o cliente. Marca `confirmacao_enviada_em` e desiste se
 * já houver marca. Se a coluna não existir, envia mesmo assim — perder a
 * confirmação seria pior que arriscar uma duplicata.
 */
export async function confirmarPorEmail(referencia: string): Promise<{ ok: boolean; motivo?: string }> {
  const db = supabaseAdmin();
  if (!db) return { ok: false, motivo: "sem_supabase" };

  const { data, error } = await db.from("pedidos")
    .select("*").eq("referencia", referencia).maybeSingle();
  if (error) return { ok: false, motivo: error.message };
  if (!data) return { ok: false, motivo: "pedido_nao_encontrado" };

  const pedido = data as Record<string, unknown>;
  if (pedido.status !== "aprovado" || !["pix", "cartao"].includes(String(pedido.metodo_pagamento))) {
    return { ok: false, motivo: "pedido_nao_aprovado_pix" };
  }
  const email = String(pedido.cliente_email ?? "").trim();
  if (!email) return { ok: false, motivo: "pedido_sem_email" };

  if (pedido.confirmacao_enviada_em) {
    return { ok: true, motivo: "ja_enviado" };
  }

  /* Cria a encomenda ANTES de montar o e-mail, para o código de rastreio já
     sair na confirmação em vez de exigir um segundo e-mail depois. Se os
     Correios falharem, segue sem rastreio — a confirmação é mais importante
     que o código, que pode ser preenchido à mão no painel. */
  let rastreio = (pedido.codigo_rastreio as string) ?? null;
  if (!rastreio) {
    const r = await criarEncomenda(referencia);
    if (r.ok) {
      rastreio = r.codigo;
      console.info("[confirmacao] encomenda criada:", r.codigo, r.jaExistia ? "(já existia)" : "");
    } else if (r.motivo !== "correios_nao_configurado") {
      console.error("[confirmacao] Correios falhou:", r.motivo);
    }
  }

  const centavos = (v: unknown) => Number(v ?? 0) || 0;
  const dados: DadosPedido = {
    referencia,
    clienteNome: (pedido.cliente_nome as string) ?? null,
    clienteEmail: email,
    clienteDocumento: (pedido.cliente_documento as string) ?? null,
    clienteTelefone: (pedido.cliente_telefone as string) ?? null,
    itens: [{
      descricao: (pedido.kit as string) ?? "Produto",
      quantidade: Number(pedido.quantidade ?? 1) || 1,
      totalCentavos: centavos(pedido.subtotal_centavos) || centavos(pedido.valor_centavos),
    }],
    subtotalCentavos: centavos(pedido.subtotal_centavos) || centavos(pedido.valor_centavos),
    descontoCentavos: centavos(pedido.desconto_centavos),
    freteCentavos: centavos(pedido.frete_centavos),
    freteTipo: (pedido.frete_tipo as string) ?? null,
    totalCentavos: centavos(pedido.valor_centavos),
    enderecoLinha: linhaEndereco((pedido.endereco as Endereco) ?? null),
    endereco: (pedido.endereco as Endereco) ?? null,
    codigoRastreio: rastreio,
  };

  const site = sitePublicoEmail();

  /* O PDF é um extra: se falhar, o e-mail sai sem anexo. Sem confirmação
     nenhuma o cliente fica achando que a compra não passou. */
  let anexos;
  try {
    const pdf = await reciboPdf(dados, { site });
    anexos = [{ filename: `comprovante-${referencia}.pdf`, content: paraBase64(pdf) }];
  } catch (e) {
    console.error("[confirmacao] PDF falhou, enviando sem anexo:", (e as Error).message);
  }

  await enviarUm(email, `Pagamento confirmado · pedido ${referencia}`,
    emailPedidoAprovado(site, dados), anexos);

  const { error: erroMarca } = await db.from("pedidos")
    .update({ confirmacao_enviada_em: new Date().toISOString() })
    .eq("referencia", referencia);
  if (erroMarca) console.error("[confirmacao] não marcou o envio:", erroMarca.message);

  return { ok: true };
}


/**
 * Manda o código PIX por e-mail logo depois de criar a cobrança.
 *
 * Sem isto, quem fechasse a aba perdia o código e não tinha como voltar —
 * o pedido ficava pendente para sempre e a venda morria. Roda em segundo
 * plano para não atrasar a resposta do checkout.
 */
export async function enviarPixPorEmail(d: DadosPedido & { brcode: string }): Promise<void> {
  if (!d.clienteEmail) return;
  const site = sitePublicoEmail();
  await enviarUm(
    d.clienteEmail,
    `Seu código PIX · pedido ${d.referencia}`,
    emailPixGerado(site, d)
  );
}


/**
 * Registra a venda no Meta Pixel pela API de Conversões.
 *
 * Separado do e-mail de propósito: são duas falhas independentes. Se a Resend
 * cair, o anúncio ainda precisa saber que houve compra; se a Meta cair, o
 * cliente ainda precisa receber a confirmação.
 *
 * A deduplicação é da Meta, por `event_id` = referência do pedido, então
 * reenvio de webhook não conta a venda duas vezes.
 */
export async function registrarCompraNoPixel(referencia: string): Promise<void> {
  const db = supabaseAdmin();
  if (!db) return;

  const { data, error } = await db.from("pedidos")
    .select("referencia,valor_centavos,pago_em,cliente_email,cliente_telefone,cliente_nome,endereco")
    .eq("referencia", referencia).eq("status", "aprovado")
    .in("metodo_pagamento", ["pix", "cartao"]).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return;

  const p = data as Record<string, unknown>;
  const e = (p.endereco as Endereco | null) ?? null;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cafecomdeusepai.com";

  const r = await enviarCompra({
    referencia,
    valorCentavos: Number(p.valor_centavos ?? 0) || 0,
    pagoEm: String(p.pago_em ?? ""),
    email: (p.cliente_email as string) ?? null,
    telefone: (p.cliente_telefone as string) ?? null,
    nome: (p.cliente_nome as string) ?? null,
    cidade: e?.localidade ?? null,
    uf: e?.uf ?? null,
    cep: e?.cep ?? null,
    urlOrigem: `${site}/checkout`,
  });

  if (r.ok) console.info("[meta] Purchase enviado:", referencia, "recebidos:", r.recebidos);
  else if (r.motivo !== "token_capi_nao_configurado") console.error("[meta] Purchase falhou:", r.motivo);
}
