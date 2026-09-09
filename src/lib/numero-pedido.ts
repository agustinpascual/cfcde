import "server-only";
import crypto from "node:crypto";
import { supabaseAdmin } from "./supabase/servidor";

/* Número do pedido: 6 dígitos, no formato que o cliente lê no e-mail e diz
   no WhatsApp — "pedido 392482". O formato antigo (PED-MTOKJGSR-H7FN) era
   impossível de ditar por telefone.

   Seis dígitos dão 900 mil combinações. Aleatório puro colide bem antes
   disso pelo paradoxo do aniversário (~1 em 1000 pedidos), então conferimos
   no banco antes de usar. A consulta é por índice único e sai em ~1 ida.

   A verificação acontece ANTES de criar a cobrança de propósito: o número
   vai para a PinPay como external_reference, então não dá para trocá-lo
   depois se o insert falhar. */

const DIGITOS = 6;
const MIN = 10 ** (DIGITOS - 1);          // 100000 — nunca começa com zero
const FAIXA = 9 * MIN;                    // 100000..999999

/** Um número aleatório sem viés — `% n` sobre bytes crus enviesa o resultado. */
function sorteia(): number {
  return MIN + crypto.randomInt(FAIXA);
}

/** Candidato de seis dígitos; quem reserva deve tratar a colisão no INSERT. */
export function sortearNumeroPedido(): string {
  return String(sorteia());
}

/**
 * Devolve um número de pedido livre. Tenta algumas vezes; se o banco não
 * responder, devolve o sorteio mesmo assim — perder a venda por causa da
 * checagem seria pior que o risco remoto de colisão.
 */
export async function novoNumeroPedido(tentativas = 5): Promise<string> {
  const db = supabaseAdmin();
  if (!db) return String(sorteia());

  for (let i = 0; i < tentativas; i++) {
    const n = String(sorteia());
    const { data, error } = await db
      .from("pedidos").select("referencia").eq("referencia", n).maybeSingle();
    if (error) {
      console.error("[pedido] falha ao conferir número:", error.message);
      return n;
    }
    if (!data) return n;
    console.warn("[pedido] número já usado, sorteando outro:", n);
  }
  /* Cinco colisões seguidas significa que a faixa está cheia demais para
     6 dígitos. Cai para 8, que é feio mas não bloqueia a venda. */
  console.error("[pedido] 6 dígitos esgotados — usando 8");
  return String(crypto.randomInt(10 ** 7, 10 ** 8));
}
