import "server-only";
import QRCode from "qrcode";
import { supabaseAdmin } from "./supabase/servidor";
import { criarPagamentoAxxon, consultarPagamentoAxxon, configuracaoAdquirenteAxxon } from "./axxonpay";
import { conferirPagamentoAxxon, idAxxon, statusAxxon, type PagamentoAxxon } from "./axxonpay-protocolo";
import { calcularCarrinhoCafe, type ItemCarrinhoCafe } from "./precos";
import { confirmarPorEmail, depois, registrarCompraNoPixel, enviarPixPorEmail } from "./confirmar-pedido";
import { entregarAcessoApp } from "./entrega-app";
import { urlWebhookAxxon } from "./axxonpay-webhook";
import { sortearNumeroPedido } from "./numero-pedido";
import { calcularParcelamentoCartao, PARCELAS_MAX, semCartao, validarCartao, type CartaoBruto } from "./cartao";
import { documentoBrasileiroValido } from "./documento-br";

const digitos = (valor: unknown) => String(valor ?? "").replace(/\D/g, "");
const texto = (valor: unknown) => typeof valor === "string" ? valor.trim().slice(0, 200) : "";
const respostaErro = (erro: string, status = 422) => Response.json({ erro }, { status });
const tentativaEncerrada = (erro: string, renovar = false) => Response.json({
  erro, codigo: "TENTATIVA_ENCERRADA_SEM_COBRANCA", ...(renovar ? { renovar: true } : {}),
}, { status: 409 });

function itensDoCorpo(body: Record<string, unknown>): ItemCarrinhoCafe[] {
  if (!Array.isArray(body.itens)) return [{ produto: texto(body.produto), qtd: Number(body.qtd) }];
  return body.itens.map((item) => {
    const linha = item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : {};
    return { produto: texto(linha.produto), qtd: Number(linha.qtd) };
  });
}

export async function respostaAxxon(p: PagamentoAxxon, referencia: string) {
  const qr = p.qrCode ?? "";
  if ((p.paymentMethod ?? p.method) === "pix" && statusAxxon(p.status) === "pending" && !qr) {
    throw new Error("PIX criado, aguardando código do gateway");
  }
  return { id: idAxxon(p.id), pedido: referencia, total: p.amount, status: statusAxxon(p.status),
    qr_code: qr, qr_code_url: qr ? await QRCode.toDataURL(qr, { width: 420, margin: 1 }) : null,
    expires_at: p.expiresAt ?? null, nextAction: p.nextAction ?? null };
}

/** Só o resultado consultado no gateway pode aprovar o pedido. */
export async function sincronizarAxxon(p: PagamentoAxxon) {
  const db = supabaseAdmin();
  if (!db) throw new Error("Banco indisponível");
  const consulta = () => db.from("pedidos").select("referencia,pix_id,status,valor_centavos,metodo_pagamento,codigo_rastreio,pix_copia_cola");
  const { data: encontrado, error } = await consulta().eq("pix_id", idAxxon(p.id)).maybeSingle();
  let pedido = encontrado;
  if (error) throw new Error("Não foi possível consultar o pedido");
  // Recupera inclusive um timeout entre a criação no gateway e a gravação do ID.
  if (!pedido && /^AXX-[a-f0-9-]{36}$/.test(p.metadata?.external_reference ?? "")) {
    const r = await consulta().eq("referencia", p.metadata!.external_reference!).is("pix_id", null).maybeSingle();
    if (r.error) throw new Error("Não foi possível recuperar o pedido");
    pedido = r.data;
  }
  // Referência curta é adivinhável: recuperação sem ID exige também o UUID
  // interno enviado na criação, nunca somente os seis dígitos do pedido.
  if (!pedido && /^[1-9]\d{5}$/.test(p.metadata?.external_reference ?? "")
      && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(p.metadata?.payment_attempt ?? "")) {
    const r = await consulta().eq("referencia", p.metadata!.external_reference!)
      .eq("id", p.metadata!.payment_attempt!).is("pix_id", null).maybeSingle();
    if (r.error) throw new Error("Não foi possível recuperar o pedido");
    pedido = r.data;
  }
  if (!pedido) throw new Error("Pedido AxxonPay não encontrado");
  conferirPagamentoAxxon(p, pedido);
  const status = statusAxxon(p.status);
  // Status desconhecido nunca aprova; fica registrado (sem dados pessoais)
  // para ser mapeado na homologação em vez de deixar um pedido pago pendente.
  if (status === "pending" && !["PENDING", "PROCESSING", "REQUIRES_ACTION"].includes(p.status.toUpperCase())) {
    console.warn("[axxonpay] status não mapeado", { id: p.id, status: p.status });
  }
  /* Polling de pagamento aberto não precisa regravar o mesmo ID a cada
     consulta. Evitar este UPDATE reduz a resposta do status e a carga no
     banco; estados finais e recuperações sem ID continuam persistidos. */
  if (status === "pending" && pedido.pix_id === idAxxon(p.id)) {
    /* O GET da Axxon é também a fonte de recuperação para cobranças antigas
       cujo QR chegou ao checkout, mas não foi persistido. Assim o cron
       preenche o código antes de tentar mandar a mensagem de WhatsApp. */
    if ((p.paymentMethod ?? p.method) === "pix" && p.qrCode && pedido.pix_copia_cola !== p.qrCode) {
      const imagem = await QRCode.toDataURL(p.qrCode, { width: 420, margin: 1 });
      const { error: erroQr } = await db.from("pedidos").update({
        pix_copia_cola: p.qrCode,
        pix_qr_url: imagem,
      }).eq("referencia", pedido.referencia).eq("pix_id", idAxxon(p.id));
      if (erroQr) throw new Error("Não foi possível salvar o código Pix");
    }
    return { pedido: pedido.referencia, codigo_rastreio: pedido.codigo_rastreio, status };
  }
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

export async function processarAxxon(bodyBruto: Record<string, unknown>, metodo: "pix" | "cartao") {
  // O cartão sai do corpo antes de qualquer outra leitura. Daqui em diante,
  // `body` não tem cartão; `cartao` só existe para a chamada de criação e
  // nunca entra em banco, log, resposta ou mensagem de erro.
  const body = semCartao(bodyBruto);
  // Campos antigos/soltos nunca são aceitos, em nenhum método.
  if (["card", "numeroCartao", "cvv", "nomeCartao", "chaveAtivacao", "chaveUsuario", "nascimentoMesAno"].some(campo => campo in bodyBruto)) {
    return respostaErro("Dados brutos de cartão não são aceitos neste formato.", 400);
  }
  if (metodo === "pix" && "cartao" in bodyBruto) return respostaErro("PIX não recebe dados de cartão.", 400);
  let cartao: CartaoBruto | null = null;
  const hash = metodo === "cartao" && typeof bodyBruto.cardHash === "string" ? bodyBruto.cardHash : "";
  if (metodo === "cartao" && "cartao" in bodyBruto) {
    if (hash) return respostaErro("Envie o cartão em um único formato.", 400);
    try { cartao = validarCartao(bodyBruto.cartao); }
    catch (erro) { return respostaErro((erro as Error).message); }
  }
  const tentativa = texto(body.tentativa);
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(tentativa)) {
    return respostaErro("Recarregue o checkout para iniciar uma tentativa segura.", 400);
  }
  const referenciaLegada = `AXX-${tentativa}`;
  let referencia = referenciaLegada;
  const nome = texto(body.nome), email = texto(body.email), documento = digitos(body.documento), celular = digitos(body.celular);
  const endereco = (body.endereco ?? {}) as Record<string, unknown>;
  if (body.loja !== "cafecomdeuspai" || nome.split(/\s+/).length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
      || ![11, 14].includes(documento.length) || ![10, 11].includes(celular.length)) {
    return respostaErro("Confira nome completo, e-mail, CPF/CNPJ e telefone com DDD.");
  }
  if (!documentoBrasileiroValido(documento)) {
    return respostaErro("Digite um CPF ou CNPJ válido. Confira os números antes de continuar.");
  }
  if (!["logradouro", "numero", "bairro", "localidade", "uf"].every(campo => texto(endereco[campo])) || digitos(endereco.cep).length !== 8) {
    return respostaErro("Complete o endereço para pagamento.");
  }
  // CEP de dígitos repetidos e UF fora do padrão são recusados pelo SDK da
  // Bloopi no 3DS; barrar aqui evita criar uma cobrança impossível de confirmar.
  if (metodo === "cartao" && (/^(\d)\1{7}$/.test(digitos(endereco.cep)) || !/^[A-Za-z]{2}$/.test(texto(endereco.uf)))) {
    return respostaErro("Confira o CEP e a UF do endereço para pagar com cartão.");
  }
  const parcelas = Number(body.installments ?? 1);
  if (metodo === "cartao" && (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > PARCELAS_MAX)) return respostaErro("Parcelas inválidas.");
  if (metodo === "cartao" && !cartao && (!hash || hash.length > 4096)) return respostaErro("Dados do cartão ausentes. Recarregue o checkout.", 400);

  let valores;
  try { valores = calcularCarrinhoCafe(itensDoCorpo(body), texto(body.frete), { cupom: texto(body.cupom), pagamento: metodo }); }
  catch { return respostaErro("Produto, quantidade ou frete inválido."); }
  const totalCobrado = metodo === "cartao"
    ? calcularParcelamentoCartao(valores.total, parcelas).total
    : valores.total;
  // Falha de configuração não pode deixar uma reserva pendente no banco.
  let postbackUrl: string;
  try { postbackUrl = urlWebhookAxxon(process.env.NEXT_PUBLIC_SITE_URL, process.env.AXXONPAY_WEBHOOK_URL); }
  catch (erro) { return respostaErro((erro as Error).message, 503); }
  const db = supabaseAdmin();
  if (!db) return respostaErro("Pagamento temporariamente indisponível.", 503);
  let etapa = "reserva";
  try {
    if (metodo === "cartao") {
      // A adquirente atual decide o formato aceito. Um formato que não bate
      // com ela (checkout desatualizado ou seleção antiga) não reserva nem cobra.
      etapa = "adquirente";
      const { modo } = await configuracaoAdquirenteAxxon();
      if ((modo === "cru") !== Boolean(cartao)) return respostaErro("O checkout está desatualizado. Recarregue a página.", 409);
      etapa = "reserva";
    }
    // O UUID ocupa a PK já existente; referencia passa a ser o número visível.
    // Reconhece também reservas antigas, sem renumerar pagamentos emitidos.
    const lerExistente = async () => {
      const { data, error } = await db.from("pedidos")
        .select("referencia,pix_id,status,valor_centavos,metodo_pagamento,cliente_documento,cliente_email")
        .or(`id.eq.${tentativa},referencia.eq.${referenciaLegada}`).maybeSingle();
      if (error) throw new Error("Reserva indisponível");
      return data;
    };
    let existente = await lerExistente();
    let reservou = false;
    for (let i = 0; !existente && i < 5; i++) {
      referencia = sortearNumeroPedido();
      if (!/^[1-9]\d{5}$/.test(referencia)) throw new Error("Número de pedido inválido");
      // UNIQUE(id) impede cobrança duplicada; UNIQUE(referencia) resolve
      // colisões com pedidos de qualquer gateway antes de chamar a AxxonPay.
      const { error: reserva } = await db.from("pedidos").insert({
        id: tentativa, referencia, status: "pendente", metodo_pagamento: metodo,
        valor_centavos: totalCobrado, subtotal_centavos: valores.subtotal, desconto_centavos: valores.desconto,
        frete_centavos: valores.frete.centavos, frete_tipo: valores.frete.nome, kit: valores.kit.nome, quantidade: valores.quantidadeTotal,
        cliente_nome: nome, cliente_email: email, cliente_documento: documento, cliente_telefone: celular,
        endereco: Object.fromEntries(["logradouro", "numero", "complemento", "bairro", "localidade", "uf", "cep"].map(campo => [campo, texto(endereco[campo])])),
      });
      if (!reserva) { reservou = true; break; }
      if (reserva.code !== "23505") throw new Error("Reserva indisponível");
      existente = await lerExistente();
      // Se outro pedido pegou o número, sorteia outro mantendo o mesmo UUID.
      // Se foi duplo clique, usa a reserva vencedora sem um segundo POST.
    }
    if (existente) {
      referencia = existente.referencia;
      if (existente.pix_id && !existente.pix_id.startsWith("axxon_")) {
        return respostaErro("Esta tentativa pertence a outro meio de pagamento. Confira o pedido anterior.", 409);
      }
      // Somente falha confirmada sem ID libera um identificador novo. Não
      // sobrescreve o comprador nem recicla uma referência já enviada à API.
      if (!existente.pix_id && existente.status === "falhou") {
        return tentativaEncerrada("A tentativa anterior foi encerrada sem cobrança. Confira os dados e clique novamente para iniciar uma nova tentativa.");
      }
      if (existente.valor_centavos !== totalCobrado || existente.metodo_pagamento !== metodo || existente.cliente_documento !== documento || existente.cliente_email !== email) {
        return respostaErro("CPF/CNPJ, e-mail, valor ou forma de pagamento foram alterados após iniciar esta tentativa. A cobrança anterior precisa ser conferida antes de gerar outra; contate o atendimento.", 409);
      }
      if (!existente.pix_id) return respostaErro("A tentativa anterior está em conferência. Não gere outra cobrança; aguarde ou contate o atendimento.", 409);
      etapa = "consulta_existente";
      const p = await consultarPagamentoAxxon(existente.pix_id.slice(6));
      await sincronizarAxxon(p);
      // Cartão pendente sem nextAction: o segredo do 3DS só veio na resposta
      // da criação (perdida, por exemplo, num 503) e não é persistido, então
      // ninguém consegue confirmar este intent — ele expira no gateway sem
      // capturar. Libera nova tentativa em vez de prender o comprador por
      // uma hora "em conferência"; a reserva antiga fica para a reconciliação.
      if (metodo === "cartao" && statusAxxon(p.status) === "pending" && !p.nextAction) {
        return tentativaEncerrada("A tentativa anterior não pôde ser confirmada e expira sem cobrança. Iniciando uma nova tentativa segura.", true);
      }
      return Response.json(await respostaAxxon(p, referencia));
    }
    if (!reservou) throw new Error("Não foi possível reservar um número de seis dígitos");
    etapa = "criacao";
    const descricao = `GOKOCO Escova Modeladora de Cabelo Bivolt - Pedido #${referencia}`.slice(0, 200);
    const criado = await criarPagamentoAxxon({
      amount: totalCobrado, paymentMethod: metodo === "pix" ? "pix" : "credit_card",
      description: descricao,
      ...(metodo === "cartao" ? { installments: parcelas, card: cartao ?? { hash } } : {}),
      customer: { name: nome, email, phone: celular, document: { number: documento, type: documento.length === 11 ? "cpf" : "cnpj" },
        address: { street: texto(endereco.logradouro), number: texto(endereco.numero), neighborhood: texto(endereco.bairro),
          city: texto(endereco.localidade), state: texto(endereco.uf), zipCode: digitos(endereco.cep) } },
      metadata: { external_reference: referencia, payment_attempt: tentativa }, postbackUrl,
    });
    // No PIX, a persistência do ID e o GET que traz o QR não dependem um do
    // outro. Executá-los juntos corta uma espera de rede sem devolver o código
    // antes de o ID estar salvo, mantendo a recuperação e a idempotência.
    etapa = metodo === "pix" ? "persistencia_e_consulta" : "persistencia_id";
    const persistirId = db.from("pedidos").update({ pix_id: idAxxon(criado.id) }).eq("referencia", referencia);
    let consultaPix: PagamentoAxxon | null = null;
    if (metodo === "pix") {
      const [persistencia, consulta] = await Promise.all([persistirId, consultarPagamentoAxxon(criado.id)]);
      if (persistencia.error) throw new Error("Cobrança criada, registro em conferência");
      consultaPix = consulta;
    } else {
      const { error } = await persistirId;
      if (error) throw new Error("Cobrança criada, registro em conferência");
    }
    const enviarEmailDoPix = (brcode: string) => depois(enviarPixPorEmail({
      referencia, clienteNome: nome, clienteEmail: email,
      itens: valores.itens.map((item) => ({ descricao: item.nome, quantidade: item.quantidade, totalCentavos: item.totalCentavos })),
      subtotalCentavos: valores.subtotal, descontoCentavos: valores.desconto, freteCentavos: valores.frete.centavos,
      freteTipo: valores.frete.nome, totalCentavos: valores.total, brcode,
    }));
    // Cartão com nextAction precisa chegar ao navegador o quanto antes. Não
    // bloqueia a abertura do 3DS com um GET redundante: o ID já foi validado e
    // persistido, e a aprovação continuará vindo exclusivamente do polling ou
    // webhook autenticado depois do desafio.
    if (metodo === "cartao" && criado.nextAction) {
      return Response.json({
        id: idAxxon(criado.id), pedido: referencia, total: totalCobrado,
        status: "pending", qr_code: "", qr_code_url: null,
        expires_at: null, nextAction: criado.nextAction,
      });
    }
    etapa = "consulta_criada";
    const consultado = consultaPix ?? await consultarPagamentoAxxon(criado.id);
    conferirPagamentoAxxon(consultado, { pix_id: idAxxon(criado.id), referencia, valor_centavos: totalCobrado, metodo_pagamento: metodo });
    const p = { ...consultado, nextAction: criado.nextAction ?? consultado.nextAction };
    // O PIX pendente já foi validado contra o pedido acima. Não bloqueia a
    // entrega do QR com uma segunda leitura + escrita no banco. O polling e o
    // webhook seguem responsáveis por sincronizar qualquer estado final.
    if (!(metodo === "pix" && statusAxxon(consultado.status) === "pending" && consultado.qrCode)) {
      await sincronizarAxxon(consultado);
    }
    etapa = "resposta";
    // Criação/3DS não são aprovação: confirma por GET autenticado ou webhook.
    const resposta = await respostaAxxon(p, referencia);
    if (metodo === "pix" && p.qrCode) {
      /* A recuperação por WhatsApp lê o código do pedido, não da resposta que
         ficou no navegador. Persistir antes de responder impede que uma aba
         fechada deixe uma cobrança válida impossível de recuperar. */
      const { error: erroQr } = await db.from("pedidos").update({
        pix_copia_cola: p.qrCode,
        pix_qr_url: resposta.qr_code_url,
      }).eq("referencia", referencia).eq("pix_id", idAxxon(p.id));
      if (erroQr) throw new Error("Cobrança criada, código Pix em conferência");
      enviarEmailDoPix(p.qrCode);
    }
    return Response.json(resposta);
  } catch (erro) {
    const http = (erro as { status?: unknown } | null)?.status;
    // Diagnóstico sem corpo, credenciais, CPF, cartão ou resposta do provedor.
    console.error("[axxonpay] falha", { referencia, etapa,
      ...(typeof http === "number" && Number.isInteger(http) && http >= 400 && http <= 599 ? { http } : {}) });
    const recusa = erro as { documentoInvalido?: boolean; cartaoRecusado?: boolean } | null;
    if (recusa?.documentoInvalido === true || recusa?.cartaoRecusado === true) {
      const { data: encerrado, error } = await db.from("pedidos").update({ status: "falhou" })
        .eq("referencia", referencia).eq("status", "pendente").is("pix_id", null).select("referencia").maybeSingle();
      if (!error && encerrado) {
        return tentativaEncerrada(recusa.documentoInvalido
          ? "O CPF/CNPJ informado não foi aceito e nenhuma cobrança foi criada. Corrija o documento antes de tentar novamente."
          : "O cartão não foi aceito e nenhuma cobrança foi criada. Confira os dados ou use outro cartão.");
      }
    }
    // Nunca tenta outro gateway após timeout: a primeira cobrança pode existir.
    return respostaErro("Não foi possível concluir agora. A tentativa foi preservada para conferência; não inicie outra tentativa neste momento.", 503);
  }
}
