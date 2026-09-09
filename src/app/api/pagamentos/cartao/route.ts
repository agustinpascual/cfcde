import { origemOficial } from "@/lib/origem";
import { excedeu, ipDe } from "@/lib/limite";
import { lerGateways } from "@/lib/gateways-config";
import { processarAxxon } from "@/lib/pagamentos-axxon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const erro = (mensagem: string, status: number, headers?: HeadersInit) =>
  Response.json({ erro: mensagem }, { status, headers: { "Cache-Control": "no-store", ...headers } });

/** Recebe o cartão em claro e o repassa à AxxonPay (adquirente Bloopi), por
 * decisão do lojista registrada em docs/axxonpay.md. O corpo só é lido depois
 * de origem, limite e seleção do gateway, e nada dele é registrado ou
 * persistido: o serviço retira o cartão antes de qualquer outra leitura. */
export async function POST(req: Request) {
  if (!origemOficial(req)) return erro("Origem não autorizada.", 403);
  // Mais apertado que o PIX: checkouts abertos são usados para testar cartões roubados.
  if (excedeu(`cartao:${ipDe(req)}`, 5, 60000)) return erro("Muitas tentativas. Aguarde um minuto.", 429, { "Retry-After": "60" });
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return erro("Conteúdo inválido.", 415);
  try {
    if ((await lerGateways()).cartao !== "axxonpay") return erro("Cartão indisponível no momento.", 503);
  } catch { return erro("Configuração de pagamentos indisponível.", 503); }
  let body: unknown;
  try {
    const bruto = await req.text();
    if (bruto.length > 16384) return erro("Requisição muito grande.", 413);
    body = JSON.parse(bruto);
  } catch { return erro("JSON inválido.", 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return erro("JSON inválido.", 400);
  try { return await processarAxxon(body as Record<string, unknown>, "cartao"); }
  catch { return erro("Pagamento temporariamente indisponível.", 503); }
}
