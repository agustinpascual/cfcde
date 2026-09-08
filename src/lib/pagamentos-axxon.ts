import "server-only";
import QRCode from "qrcode";
import { supabaseAdmin } from "./supabase/servidor";
import { criarPagamentoAxxon, consultarPagamentoAxxon, configuracaoAdquirenteAxxon } from "./axxonpay";
import { conferirPagamentoAxxon, idAxxon, statusAxxon, type PagamentoAxxon } from "./axxonpay-protocolo";
import { calcularTotalCafe } from "./precos";
import { confirmarPorEmail, depois, registrarCompraNoPixel, enviarPixPorEmail } from "./confirmar-pedido";
import { entregarAcessoApp } from "./entrega-app";

const digitos = (valor: unknown) => String(valor ?? "").replace(/\D/g, "");
const texto = (valor: unknown) => typeof valor === "string" ? valor.trim().slice(0, 200) : "";
const respostaErro = (erro: string, status = 422) => Response.json({ erro }, { status });

export async function respostaAxxon(p: PagamentoAxxon, referencia: string) {
  const qr = p.qrCode ?? "";
  return { id: idAxxon(p.id), pedido: referencia, total: p.amount, status: statusAxxon(p.status),
    qr_code: qr, qr_code_url: qr ? await QRCode.toDataURL(qr, { width: 420, margin: 1 }) : null,
    expires_at: p.expiresAt ?? null, nextAction: p.nextAction ?? null };
}

/** Só o resultado consultado no gateway pode aprovar o pedido. */
export async function sincronizarAxxon(p: PagamentoAxxon) {
  const db = supabaseAdmin();
  if (!db) throw new Error("Banco indisponível");
  const consulta = () => db.from("pedidos").select("referencia,pix_id,status,valor_centavos,metodo_pagamento,codigo_rastreio");
  const { data: encontrado, error } = await consulta().eq("pix_id", idAxxon(p.id)).maybeSingle();
  let pedido = encontrado;
  if (error) throw new Error("Não foi possível consultar o pedido");
  // Recupera inclusive um timeout entre a criação no gateway e a gravação do ID.
  if (!pedido && /^AXX-[a-f0-9-]{36}$/.test(p.metadata?.external_reference ?? "")) {
    const r = await consulta().eq("referencia", p.metadata!.external_reference!).is("pix_id", null).maybeSingle();
    if (r.error) throw new Error("Não foi possível recuperar o pedido");
    pedido = r.data;
  }
  if (!pedido) throw new Error("Pedido AxxonPay não encontrado");
  conferirPagamentoAxxon(p, pedido);
  const status = statusAxxon(p.status);
  const novo = { approved: "aprovado", failed: "falhou", expired: "expirado", refunded: "estornado" }[status];
  // Eventos fora de ordem não rebaixam uma aprovação ou desfazem um estorno.
  const podeMudar = novo && pedido.status !== "estornado" && (pedido.status !== "aprovado" || novo === "estornado");
  const { data: atualizado, error: erroUpdate } = await db.from("pedidos").update({
    pix_id: idAxxon(p.id), ...(podeMudar ? { status: novo } : {}),
    ...(podeMudar && novo === "aprovado" ? { pago_em: p.confirmedAt ?? new Date().toISOString() } : {}),
  }).eq("referencia", pedido.referencia).eq("status", pedido.status).select("referencia").maybeSingle();
  if (erroUpdate) throw new Error("Não foi possível atualizar o pagamento");
  if (atualizado && podeMudar && novo === "aprovado") {
    depois(confirmarPorEmail(pedido.referencia));
    depois(registrarCompraNoPixel(pedido.referencia));
    depois(entregarAcessoApp(pedido.referencia));
  }
  const estadoEfetivo = String(atualizado && podeMudar ? novo : pedido.status);
  const estados: Record<string, string> = { aprovado: "approved", estornado: "refunded", falhou: "failed", expirado: "expired" };
  const statusEfetivo = estados[estadoEfetivo] ?? status;
  return { pedido: pedido.referencia, codigo_rastreio: pedido.codigo_rastreio, status: statusEfetivo };
}

export async function processarAxxon(body: Record<string, unknown>, metodo: "pix" | "cartao") {
  const tentativa = texto(body.tentativa);
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(tentativa)) {
    return respostaErro("Recarregue o checkout para iniciar uma tentativa segura.", 400);
  }
  const referencia = `AXX-${tentativa}`;
  const nome = texto(body.nome), email = texto(body.email), documento = digitos(body.documento), celular = digitos(body.celular);
  const endereco = (body.endereco ?? {}) as Record<string, unknown>;
  if (body.loja !== "cafecomdeuspai" || nome.split(/\s+/).length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
      || ![11, 14].includes(documento.length) || ![10, 11].includes(celular.length)) {
    return respostaErro("Confira nome completo, e-mail, CPF/CNPJ e telefone com DDD.");
  }
  if (!["logradouro", "numero", "bairro", "localidade", "uf"].every(campo => texto(endereco[campo])) || digitos(endereco.cep).length !== 8) {
    return respostaErro("Complete o endereço para pagamento.");
  }
  const hash = typeof body.cardHash === "string" ? body.cardHash : "";
  const parcelas = Number(body.installments ?? 1);
  // O servidor aceita SOMENTE token, nunca PAN, validade ou CVV.
  if (["card", "numeroCartao", "cvv", "chaveAtivacao", "chaveUsuario"].some(campo => campo in body)) return respostaErro("Dados brutos de cartão não são aceitos.", 400);
  if (metodo === "cartao" && (!hash || hash.length > 4096 || !Number.isInteger(parcelas) || parcelas < 1 || parcelas > 4)) return respostaErro("Token de cartão ou parcelas inválidos.");

  let valores;
  try { valores = calcularTotalCafe(texto(body.produto), Number(body.qtd), texto(body.frete), { cupom: texto(body.cupom), pagamento: metodo }); }
  catch { return respostaErro("Produto, quantidade ou frete inválido."); }
  const db = supabaseAdmin();
  if (!db) return respostaErro("Pagamento temporariamente indisponível.", 503);
  try {
    if (metodo === "cartao") await configuracaoAdquirenteAxxon();
    // Reserva única ANTES da cobrança: duplo clique e reenvio não criam outro pagamento.
    const { error: reserva } = await db.from("pedidos").insert({
      referencia, status: "pendente", metodo_pagamento: metodo,
      valor_centavos: valores.total, subtotal_centavos: valores.subtotal, desconto_centavos: valores.desconto,
      frete_centavos: valores.frete.centavos, frete_tipo: valores.frete.nome, kit: valores.kit.nome, quantidade: Number(body.qtd),
      cliente_nome: nome, cliente_email: email, cliente_documento: documento, cliente_telefone: celular,
      endereco: Object.fromEntries(["logradouro", "numero", "complemento", "bairro", "localidade", "uf", "cep"].map(campo => [campo, texto(endereco[campo])])),
    });
    if (reserva) {
      if (reserva.code !== "23505") throw new Error("Reserva indisponível");
      const { data: existente, error } = await db.from("pedidos").select("pix_id,valor_centavos,metodo_pagamento,cliente_documento,cliente_email")
        .eq("referencia", referencia).maybeSingle();
      if (error || !existente) throw new Error("Reserva indisponível");
      if (existente.valor_centavos !== valores.total || existente.metodo_pagamento !== metodo || existente.cliente_documento !== documento || existente.cliente_email !== email) {
        return respostaErro("Já existe uma tentativa com outros dados. Confira o pedido anterior antes de tentar novamente.", 409);
      }
      if (!existente.pix_id) return respostaErro("A tentativa anterior está em conferência. Não gere outra cobrança; aguarde ou contate o atendimento.", 409);
      const p = await consultarPagamentoAxxon(existente.pix_id.slice(6));
      await sincronizarAxxon(p);
      return Response.json(await respostaAxxon(p, referencia));
    }
    const origem = process.env.NEXT_PUBLIC_SITE_URL;
    if (!origem || new URL(origem).protocol !== "https:") throw new Error("URL pública não configurada");
    const p = await criarPagamentoAxxon({
      amount: valores.total, paymentMethod: metodo === "pix" ? "pix" : "credit_card", description: `Pedido ${referencia} · ${valores.kit.nome}`,
      ...(metodo === "cartao" ? { installments: parcelas, card: { hash } } : {}),
      customer: { name: nome, email, phone: celular, document: { number: documento, type: documento.length === 11 ? "cpf" : "cnpj" },
        address: { street: texto(endereco.logradouro), number: texto(endereco.numero), neighborhood: texto(endereco.bairro),
          city: texto(endereco.localidade), state: texto(endereco.uf), zipCode: digitos(endereco.cep) } },
      metadata: { external_reference: referencia }, postbackUrl: new URL("/api/webhooks/axxonpay", origem).toString(),
    });
    if (p.amount !== valores.total) throw new Error("Valor retornado divergente");
    const { error } = await db.from("pedidos").update({ pix_id: idAxxon(p.id) }).eq("referencia", referencia);
    if (error) throw new Error("Cobrança criada, registro em conferência");
    // Criação/3DS não são aprovação: confirma por GET autenticado ou webhook.
    const resposta = await respostaAxxon(p, referencia);
    if (metodo === "pix" && p.qrCode) depois(enviarPixPorEmail({
      referencia, clienteNome: nome, clienteEmail: email, itens: [{ descricao: valores.kit.nome, quantidade: Number(body.qtd), totalCentavos: valores.subtotal }],
      subtotalCentavos: valores.subtotal, descontoCentavos: valores.desconto, freteCentavos: valores.frete.centavos,
      freteTipo: valores.frete.nome, totalCentavos: valores.total, brcode: p.qrCode,
    }));
    return Response.json(resposta);
  } catch {
    // Nunca tenta outro gateway após timeout: a primeira cobrança pode existir.
    return respostaErro("Não foi possível concluir agora. A tentativa foi preservada para conferência; não repita em outro gateway.", 503);
  }
}
