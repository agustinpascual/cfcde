import "server-only";
import { ler } from "./config-integracoes";
import { supabaseAdmin } from "./supabase/servidor";

/* Criação de encomenda nos Correios.

   O endpoint não manda cabeçalhos CORS de propósito: se mandasse, o segredo
   teria que estar no JavaScript da página e qualquer visitante criaria
   encomendas. Por isso esta chamada só existe no servidor — nunca exponha
   `CORREIOS_SECRET` com prefixo NEXT_PUBLIC_.

   Corpo mínimo aceito pelo endpoint:
     { pedido_id, status_pagamento, destino: { cidade, uf } }
   Resposta 201: { codigo: "AB123456789BR", criado: true } */

type Endereco = { localidade?: string; uf?: string };

export type ResultadoEncomenda =
  | { ok: true; codigo: string; jaExistia?: boolean }
  | { ok: false; motivo: string };

const TEMPO_LIMITE_MS = 20_000;

/**
 * Cria a encomenda de um pedido pago e devolve o código de rastreio.
 *
 * Idempotente: se o pedido já tem `codigo_rastreio`, devolve o que está lá
 * sem chamar de novo — a PinPay reenvia o webhook, e duas chamadas gerariam
 * duas etiquetas para a mesma venda.
 */
export async function criarEncomenda(referencia: string): Promise<ResultadoEncomenda> {
  const [url, segredo] = await Promise.all([ler("CORREIOS_URL"), ler("CORREIOS_SECRET")]);
  if (!url || !segredo) return { ok: false, motivo: "correios_nao_configurado" };

  const db = supabaseAdmin();
  if (!db) return { ok: false, motivo: "sem_supabase" };

  const { data, error } = await db.from("pedidos")
    .select("referencia,endereco,codigo_rastreio").eq("referencia", referencia).maybeSingle();
  if (error) return { ok: false, motivo: error.message };
  if (!data) return { ok: false, motivo: "pedido_nao_encontrado" };

  const pedido = data as { endereco: Endereco | null; codigo_rastreio?: string | null };
  if (pedido.codigo_rastreio) {
    return { ok: true, codigo: pedido.codigo_rastreio, jaExistia: true };
  }

  const cidade = pedido.endereco?.localidade?.trim();
  const uf = pedido.endereco?.uf?.trim().toUpperCase();
  if (!cidade || !uf) return { ok: false, motivo: "pedido_sem_cidade_uf" };

  /* Teto de tempo: sem ele, um endpoint lento seguraria a tarefa de fundo
     indefinidamente e o e-mail de confirmação nunca sairia. */
  const corta = new AbortController();
  const relogio = setTimeout(() => corta.abort(), TEMPO_LIMITE_MS);
  let resposta: Response;
  try {
    resposta = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-integration-secret": segredo },
      body: JSON.stringify({
        pedido_id: referencia,
        status_pagamento: "pago",
        destino: { cidade, uf },
      }),
      signal: corta.signal,
    });
  } catch (e) {
    return { ok: false, motivo: (e as Error).name === "AbortError" ? "tempo_esgotado" : (e as Error).message };
  } finally {
    clearTimeout(relogio);
  }

  const texto = await resposta.text();
  if (!resposta.ok) {
    console.error("[correios] HTTP", resposta.status, texto.slice(0, 200));
    return { ok: false, motivo: `HTTP ${resposta.status}` };
  }

  let corpo: { codigo?: string; criado?: boolean };
  try { corpo = JSON.parse(texto); } catch { return { ok: false, motivo: "resposta_nao_json" }; }
  const codigo = corpo.codigo?.trim();
  if (!codigo) return { ok: false, motivo: "resposta_sem_codigo" };

  /* Grava o código. Se a coluna ainda não existir (migration 0021), o rastreio
     não persiste — mas o código já foi gerado, então ele segue para o e-mail
     em vez de se perder. */
  const { error: erroGravar } = await db.from("pedidos")
    .update({ codigo_rastreio: codigo, rastreio_atualizado: new Date().toISOString() })
    .eq("referencia", referencia);
  if (erroGravar) console.error("[correios] não gravou o rastreio:", erroGravar.message);

  return { ok: true, codigo };
}
