import "server-only";
import { criarTokenRecuperacaoCarrinho } from "./carrinho-recuperacao";
import { ler } from "./config-integracoes";
import {
  MENSAGEM_CARRINHO_PADRAO, MENSAGEM_PIX_PADRAO, numeroWhatsapp,
  preencherMensagemRecuperacao, primeiroNome,
} from "./mensagens-recuperacao";
import { enviarWhatsApp, enviarWhatsAppComBotaoCopiar } from "./robo";
import { supabaseAdmin } from "./supabase/servidor";

const ATRASOS_VALIDOS = new Set([0, 5, 10, 15, 30, 60, 120, 360, 1440]);
const LIMITE_POR_TIPO = 30;

export function validarAtrasoRecuperacao(valor: unknown): number | null {
  const numero = typeof valor === "number" ? valor : Number(valor);
  return Number.isInteger(numero) && ATRASOS_VALIDOS.has(numero) ? numero : null;
}

const moeda = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", {
  style: "currency", currency: "BRL",
});

const telefoneValido = (telefone: string | null | undefined) => {
  const numero = numeroWhatsapp(telefone);
  return /^55\d{10,11}$/.test(numero) ? numero : null;
};

type ResultadoTipo = { encontrados: number; enviados: number; ignorados: number; erros: number };
export type ResultadoRecuperacoes = { pix: ResultadoTipo; carrinho: ResultadoTipo };
const vazio = (): ResultadoTipo => ({ encontrados: 0, enviados: 0, ignorados: 0, erros: 0 });

async function recuperarPix(atraso: number, modelo: string, botaoCopiar: boolean): Promise<ResultadoTipo> {
  const resultado = vazio();
  const db = supabaseAdmin();
  if (!db || atraso === 0) return resultado;
  const limite = new Date(Date.now() - atraso * 60_000).toISOString();
  const { data, error } = await db.from("pedidos")
    .select("id,referencia,status,cliente_nome,cliente_telefone,valor_centavos,pix_copia_cola,recuperacao_pix_tentativas")
    .eq("status", "pendente").eq("metodo_pagamento", "pix")
    .is("recuperacao_pix_em", null).lte("criado_em", limite)
    .order("criado_em", { ascending: true }).limit(LIMITE_POR_TIPO);
  if (error) throw new Error(error.message);
  resultado.encontrados = data?.length ?? 0;

  for (const pedido of data ?? []) {
    const agora = new Date().toISOString();
    const { data: reservado } = await db.from("pedidos")
      .update({ recuperacao_pix_em: agora, recuperacao_pix_erro: null })
      .eq("id", pedido.id).eq("status", "pendente").is("recuperacao_pix_em", null)
      .select("id").maybeSingle();
    if (!reservado) { resultado.ignorados++; continue; }
    try {
      const telefone = telefoneValido(pedido.cliente_telefone);
      if (!telefone || !pedido.pix_copia_cola) { resultado.ignorados++; continue; }
      const mensagem = preencherMensagemRecuperacao(modelo, {
        nome: primeiroNome(pedido.cliente_nome), pedido: pedido.referencia,
        valor: moeda(pedido.valor_centavos), codigo_pix: pedido.pix_copia_cola,
      });
      if (botaoCopiar) {
        try {
          await enviarWhatsAppComBotaoCopiar(telefone, mensagem, pedido.pix_copia_cola);
        } catch (erroBotao) {
          /* Botões dependem da versão/termos do WhatsApp. Se a Z-API recusar,
             a recuperação continua como texto e a venda não é perdida. */
          console.warn("[recuperacoes] botão Pix indisponível; enviando texto:", (erroBotao as Error).message);
          await enviarWhatsApp(telefone, mensagem);
        }
      } else {
        await enviarWhatsApp(telefone, mensagem);
      }
      resultado.enviados++;
    } catch (erro) {
      resultado.erros++;
      await db.from("pedidos").update({
        recuperacao_pix_em: null,
        recuperacao_pix_erro: String((erro as Error).message).slice(0, 500),
        recuperacao_pix_tentativas: Number(pedido.recuperacao_pix_tentativas ?? 0) + 1,
      }).eq("id", pedido.id);
    }
  }
  return resultado;
}

type EventoCarrinho = { sessao: string; dados: Record<string, unknown> | null; criado_em: string };
const texto = (valor: unknown) => typeof valor === "string" && valor.trim() ? valor.trim() : null;

async function recuperarCarrinhos(atraso: number, modelo: string): Promise<ResultadoTipo> {
  const resultado = vazio();
  const db = supabaseAdmin();
  if (!db || atraso === 0) return resultado;
  const limite = new Date(Date.now() - atraso * 60_000).toISOString();
  const { data: eventos, error } = await db.from("eventos")
    .select("sessao,dados,criado_em").eq("tipo", "checkout_parcial").lte("criado_em", limite)
    .order("criado_em", { ascending: false }).limit(500);
  if (error) throw new Error(error.message);

  const ultimos = new Map<string, EventoCarrinho>();
  for (const evento of (eventos ?? []) as EventoCarrinho[]) {
    if (!ultimos.has(evento.sessao)) ultimos.set(evento.sessao, evento);
  }
  const ids = [...ultimos.keys()];
  if (!ids.length) return resultado;
  const { data: sessoes, error: erroSessoes } = await db.from("sessoes")
    .select("sessao,pedido_ref,recuperacao_carrinho_em,recuperacao_carrinho_tentativas")
    .in("sessao", ids).is("pedido_ref", null).is("recuperacao_carrinho_em", null)
    .limit(LIMITE_POR_TIPO);
  if (erroSessoes) throw new Error(erroSessoes.message);
  resultado.encontrados = sessoes?.length ?? 0;

  for (const sessao of sessoes ?? []) {
    const evento = ultimos.get(sessao.sessao);
    if (!evento) continue;
    const dados = evento.dados ?? {};
    const telefoneOriginal = texto(dados.telefone);
    const telefone = telefoneValido(telefoneOriginal);

    /* Defesa extra caso o navegador não tenha conseguido gravar pedido_ref:
       um pedido posterior com o mesmo telefone transforma a jornada em Pix e
       impede a mensagem de carrinho. */
    const digitos = (telefoneOriginal ?? "").replace(/\D/g, "");
    if (digitos) {
      const { data: pedido } = await db.from("pedidos").select("referencia")
        .eq("cliente_telefone", digitos).gte("criado_em", evento.criado_em).limit(1).maybeSingle();
      if (pedido) {
        await db.from("sessoes").update({ recuperacao_carrinho_em: new Date().toISOString() })
          .eq("sessao", sessao.sessao).is("recuperacao_carrinho_em", null);
        resultado.ignorados++;
        continue;
      }
    }

    const agora = new Date().toISOString();
    const { data: reservado } = await db.from("sessoes")
      .update({ recuperacao_carrinho_em: agora, recuperacao_carrinho_erro: null })
      .eq("sessao", sessao.sessao).is("pedido_ref", null).is("recuperacao_carrinho_em", null)
      .select("sessao").maybeSingle();
    if (!reservado) { resultado.ignorados++; continue; }
    try {
      const token = criarTokenRecuperacaoCarrinho(sessao.sessao);
      if (!telefone || !token) { resultado.ignorados++; continue; }
      const origem = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://cafecomdeusepai.com").replace(/\/$/, "");
      const link = `${origem}/checkout/recuperar/${encodeURIComponent(token)}`;
      const valor = typeof dados.valor === "number" ? moeda(dados.valor) : "a confirmar";
      const mensagem = preencherMensagemRecuperacao(modelo, {
        nome: primeiroNome(texto(dados.nome)), produto: texto(dados.produto_nome) ?? "Produto selecionado",
        valor, link,
      });
      await enviarWhatsApp(telefone, mensagem);
      resultado.enviados++;
    } catch (erro) {
      resultado.erros++;
      await db.from("sessoes").update({
        recuperacao_carrinho_em: null,
        recuperacao_carrinho_erro: String((erro as Error).message).slice(0, 500),
        recuperacao_carrinho_tentativas: Number(sessao.recuperacao_carrinho_tentativas ?? 0) + 1,
      }).eq("sessao", sessao.sessao);
    }
  }
  return resultado;
}

export async function processarRecuperacoesWhatsApp(): Promise<ResultadoRecuperacoes> {
  const [atrasoPixBruto, atrasoCarrinhoBruto, modeloPix, modeloCarrinho, botaoPixBruto] = await Promise.all([
    ler("WHATSAPP_RECUPERACAO_PIX_MINUTOS"), ler("WHATSAPP_RECUPERACAO_CARRINHO_MINUTOS"),
    ler("WHATSAPP_MSG_PIX_PENDENTE"), ler("WHATSAPP_MSG_CARRINHO_ABANDONADO"),
    ler("WHATSAPP_PIX_BOTAO_COPIAR"),
  ]);
  const atrasoPix = validarAtrasoRecuperacao(atrasoPixBruto ?? 0) ?? 0;
  const atrasoCarrinho = validarAtrasoRecuperacao(atrasoCarrinhoBruto ?? 0) ?? 0;

  /* Pix vem primeiro. A sessão que já gerou cobrança é excluída do carrinho
     por pedido_ref e pela conferência adicional de telefone. */
  const pix = await recuperarPix(atrasoPix, modeloPix ?? MENSAGEM_PIX_PADRAO, botaoPixBruto !== "0");
  const carrinho = await recuperarCarrinhos(atrasoCarrinho, modeloCarrinho ?? MENSAGEM_CARRINHO_PADRAO);
  return { pix, carrinho };
}
