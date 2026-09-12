import "server-only";
import crypto from "node:crypto";
import { lerCarrinhoAbandonado } from "@/components/painel/dados";

const DURACAO_SEGUNDOS = 14 * 24 * 60 * 60;
export const COOKIE_RECUPERACAO_CARRINHO = "cdp_recuperar";
export const DURACAO_COOKIE_RECUPERACAO = 30 * 60;

function segredo() {
  return process.env.RECUPERACAO_CARRINHO_SECRET?.trim()
    || process.env.CHAVE_MESTRA?.trim()
    || process.env.PAINEL_SESSION_SECRET?.trim()
    || (process.env.NODE_ENV !== "production" ? process.env.PAINEL_SENHA?.trim() : "")
    || "";
}

function assinatura(corpo: string, chave: string) {
  return crypto.createHmac("sha256", chave).update(`carrinho:${corpo}`).digest("base64url");
}

export function criarTokenRecuperacaoCarrinho(sessao: string, agora = Date.now()): string | null {
  const chave = segredo();
  if (!chave || !/^[A-Za-z0-9_-]{8,64}$/.test(sessao)) return null;
  const corpo = Buffer.from(JSON.stringify({
    s: sessao,
    e: Math.floor(agora / 1000) + DURACAO_SEGUNDOS,
  })).toString("base64url");
  return `${corpo}.${assinatura(corpo, chave)}`;
}

export function verificarTokenRecuperacaoCarrinho(token: string, agora = Date.now()): string | null {
  const chave = segredo();
  const [corpo, recebido, extra] = token.split(".");
  if (!chave || !corpo || !recebido || extra || token.length > 500) return null;
  const esperado = assinatura(corpo, chave);
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(corpo, "base64url").toString("utf8")) as { s?: unknown; e?: unknown };
    if (typeof payload.s !== "string" || !/^[A-Za-z0-9_-]{8,64}$/.test(payload.s)) return null;
    if (typeof payload.e !== "number" || payload.e < Math.floor(agora / 1000)) return null;
    return payload.s;
  } catch {
    return null;
  }
}

export type CheckoutRecuperado = {
  itens: { slug: string; quantidade: number }[];
  prefill: {
    email: string | null;
    firstName: string;
    lastName: string;
    documentNumber: string | null;
    phone: string | null;
    cep: string | null;
    address: {
      street: string; number: string; complement: string;
      neighborhood: string; city: string; state: string;
    };
    shippingMethod: "pac" | "sedex" | null;
    paymentMethod: "pix" | "card" | null;
    coupon: string | null;
    withoutNumber: boolean;
  };
};

export async function lerCheckoutRecuperado(token: string): Promise<CheckoutRecuperado | null> {
  const sessao = verificarTokenRecuperacaoCarrinho(token);
  if (!sessao) return null;
  const carrinho = await lerCarrinhoAbandonado(sessao);
  if (!carrinho) return null;

  const partesNome = (carrinho.nome ?? "").trim().split(/\s+/).filter(Boolean);
  const firstName = partesNome.shift() ?? "";
  return {
    itens: carrinho.itens,
    prefill: {
      email: carrinho.email,
      firstName,
      lastName: partesNome.join(" "),
      documentNumber: carrinho.documento,
      phone: carrinho.telefone,
      cep: carrinho.cep,
      address: {
        street: carrinho.logradouro ?? "",
        number: carrinho.sem_numero ? "" : carrinho.numero ?? "",
        complement: carrinho.complemento ?? "",
        neighborhood: carrinho.bairro ?? "",
        city: carrinho.cidade ?? "",
        state: carrinho.uf ?? "",
      },
      shippingMethod: carrinho.frete_tipo,
      paymentMethod: carrinho.metodo_pagamento,
      coupon: carrinho.cupom,
      withoutNumber: carrinho.sem_numero,
    },
  };
}
