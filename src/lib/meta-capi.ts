import "server-only";
import crypto from "node:crypto";
import { ler } from "./config-integracoes";

/* API de Conversões da Meta (server-side).

   Por que a compra não pode ser rastreada pelo navegador: o PIX é confirmado
   por webhook, minutos depois de o cliente fechar a aba. Se dependêssemos do
   `fbq('track','Purchase')`, só contaríamos quem ficasse com a página aberta
   até o pagamento cair — a maioria das vendas sumiria do Gerenciador.

   A Meta exige identificadores pessoais em SHA-256. Mandar em texto puro é
   recusado e seria vazamento de dado do cliente. */

const ENDPOINT = (id: string) => `https://graph.facebook.com/v21.0/${id}/events`;
const LIMITE_MS = 15_000;

/** SHA-256 no formato que a Meta exige: minúsculo, sem espaço nas pontas. */
const hash = (v?: string | null) => {
  const limpo = (v ?? "").trim().toLowerCase();
  return limpo ? crypto.createHash("sha256").update(limpo).digest("hex") : undefined;
};

/** Telefone só com dígitos, com DDI — o padrão que a Meta espera antes do hash. */
const hashTelefone = (v?: string | null) => {
  let n = (v ?? "").replace(/\D/g, "");
  if (!n) return undefined;
  if (n.length <= 11) n = "55" + n;   // número brasileiro sem DDI
  return crypto.createHash("sha256").update(n).digest("hex");
};

export type DadosCompra = {
  referencia: string;
  valorCentavos: number;
  pagoEm: string;
  email?: string | null;
  telefone?: string | null;
  nome?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  urlOrigem?: string;
};

export type ResultadoPixel = { ok: boolean; motivo?: string; recebidos?: number };

/** Pares (pixel, token), casados pela POSIÇÃO nas duas listas separadas por
    vírgula. Se as listas tiverem tamanhos diferentes, sobra pixel sem token —
    e esse é ignorado, com aviso, em vez de mandar evento com credencial de
    outro pixel (a Meta recusaria e o erro seria confuso). */
export async function paresConfigurados(): Promise<{ id: string; token: string }[]> {
  const ids = (process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "").split(",").map((s) => s.trim());
  const tokens = ((await ler("META_CAPI_TOKEN")) ?? "").split(",").map((s) => s.trim());
  const pares: { id: string; token: string }[] = [];
  ids.forEach((id, i) => {
    if (!/^\d+$/.test(id) || pares.some((par) => par.id === id)) return;
    if (tokens[i]) pares.push({ id, token: tokens[i] });
    else console.warn(`[meta] pixel ${id} sem token na posição ${i + 1} — ignorado`);
  });
  return pares;
}

/**
 * Envia o evento Purchase. Idempotente do lado da Meta: `event_id` usa a
 * referência do pedido, então um reenvio do webhook não conta a venda duas
 * vezes — a Meta descarta o duplicado.
 */
export async function enviarCompra(d: DadosCompra): Promise<ResultadoPixel> {
  const eventoEm = Math.floor(Date.parse(d.pagoEm) / 1000);
  const agora = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(eventoEm) || eventoEm > agora || eventoEm < agora - 7 * 86400) {
    return { ok: false, motivo: "data_pagamento_invalida_ou_fora_da_janela" };
  }
  if (!d.referencia || !Number.isSafeInteger(d.valorCentavos) || d.valorCentavos <= 0) {
    return { ok: false, motivo: "dados_compra_invalidos" };
  }
  const pares = await paresConfigurados();
  if (!pares.length) return { ok: false, motivo: "token_capi_nao_configurado" };

  const [primeiro, ...resto] = (d.nome ?? "").trim().split(/\s+/);

  const evento = {
    event_name: "Purchase",
    event_time: eventoEm,
    event_id: `pedido-${d.referencia}`,   // chave de deduplicação
    action_source: "website",
    ...(d.urlOrigem ? { event_source_url: d.urlOrigem } : {}),
    user_data: {
      em: hash(d.email) ? [hash(d.email)] : undefined,
      ph: hashTelefone(d.telefone) ? [hashTelefone(d.telefone)] : undefined,
      fn: hash(primeiro) ? [hash(primeiro)] : undefined,
      ln: hash(resto.join(" ")) ? [hash(resto.join(" "))] : undefined,
      ct: hash(d.cidade?.replace(/\s/g, "")) ? [hash(d.cidade?.replace(/\s/g, ""))] : undefined,
      st: hash(d.uf) ? [hash(d.uf)] : undefined,
      zp: hash(d.cep?.replace(/\D/g, "")) ? [hash(d.cep?.replace(/\D/g, ""))] : undefined,
      country: [hash("br")],
    },
    custom_data: {
      currency: "BRL",
      value: Number((d.valorCentavos / 100).toFixed(2)),
      order_id: d.referencia,
    },
  };

  /* Um envio por pixel, em paralelo e independentes: se um token estiver
     vencido, o outro pixel ainda registra a venda. */
  const envios = await Promise.all(pares.map(async ({ id, token }) => {
    const corta = new AbortController();
    const relogio = setTimeout(() => corta.abort(), LIMITE_MS);
    try {
      const r = await fetch(ENDPOINT(id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [evento], access_token: token }),
        signal: corta.signal,
      });
      const texto = await r.text();
      if (!r.ok) {
        console.error(`[meta] Purchase recusado no pixel ${id}:`, r.status, texto.slice(0, 250));
        return { id, ok: false, recebidos: 0 };
      }
      const corpo = JSON.parse(texto) as { events_received?: number };
      console.info(`[meta] Purchase aceito no pixel ${id}:`, corpo.events_received);
      return { id, ok: (corpo.events_received ?? 0) > 0, recebidos: corpo.events_received ?? 0 };
    } catch (e) {
      const err = e as Error;
      console.error(`[meta] pixel ${id} falhou:`, err.name === "AbortError" ? "tempo esgotado" : err.message.slice(0, 120));
      return { id, ok: false, recebidos: 0 };
    } finally {
      clearTimeout(relogio);
    }
  }));

  const aceitos = envios.filter((e) => e.ok);
  const esperados = new Set((process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "")
    .split(",").map((id) => id.trim()).filter((id) => /^\d+$/.test(id))).size;
  if (envios.length < esperados) {
    return { ok: false, motivo: "pixels_sem_token", recebidos: aceitos.reduce((a, e) => a + e.recebidos, 0) };
  }
  return aceitos.length === envios.length
    ? { ok: true, recebidos: aceitos.reduce((a, e) => a + e.recebidos, 0) }
    : { ok: false, motivo: aceitos.length ? "envio_parcial" : "nenhum_pixel_aceitou",
        recebidos: aceitos.reduce((a, e) => a + e.recebidos, 0) };
}
