import { ipDe, excedeu } from "@/lib/limite";
import { origemOficial } from "@/lib/origem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE = "https://api.bloopi.io/functions/v1";
const STATUS_REPETIVEIS = new Set([408, 425, 429, 500, 502, 503, 504]);
const esperar = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function caminhoPermitido(partes: string[]) {
  if (partes.length === 1 && partes[0] === "checkout-config") return "checkout-config";
  if (partes.length === 2 && partes[0] === "get-checkout-info" && /^[A-Za-z0-9_-]{2,120}$/.test(partes[1])) {
    return `get-checkout-info/${partes[1]}`;
  }
  return null;
}

const jsonErro = (status: number) => Response.json(
  { error: "Não foi possível consultar o ambiente seguro." },
  { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
);

/**
 * Safari/iOS encerrou repetidamente as duas leituras CORS da Bloopi com
 * `Load failed` depois que a Axxon já havia criado o intent. Somente GETs
 * idempotentes passam por esta rota e podem ser repetidos. As etapas mutáveis
 * usam a rota one-shot separada `bloopi-envio`, que nunca faz retry.
 */
export async function GET(req: Request, contexto: { params: Promise<{ path: string[] }> }) {
  if (!origemOficial(req)) return jsonErro(403);
  if (excedeu(`bloopi-leitura:${ipDe(req)}`, 80, 60_000)) return jsonErro(429);

  const caminho = caminhoPermitido((await contexto.params).path);
  if (!caminho) return jsonErro(404);

  const publica = req.headers.get("x-public-key")?.trim() ?? "";
  const segredo = req.headers.get("x-checkout-secret")?.trim() ?? "";
  if (!/^[A-Za-z0-9_-]{8,300}$/.test(publica) || segredo.length > 1000) return jsonErro(400);

  const headers = new Headers({ Accept: "application/json", "x-public-key": publica });
  if (segredo) headers.set("x-checkout-secret", segredo);

  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try {
      const resposta = await fetch(`${BASE}/${caminho}`, {
        method: "GET",
        headers,
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(6000),
      });
      if (resposta.status >= 300 && resposta.status < 400) return jsonErro(502);
      if (tentativa === 0 && STATUS_REPETIVEIS.has(resposta.status)) {
        await esperar(250);
        continue;
      }
      const saida = new Headers({
        "Content-Type": resposta.headers.get("content-type") ?? "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      const retryAfter = resposta.headers.get("retry-after");
      const codigoPlataforma = resposta.headers.get("sb-error-code");
      if (retryAfter) saida.set("Retry-After", retryAfter);
      if (codigoPlataforma) saida.set("sb-error-code", codigoPlataforma);
      return new Response(await resposta.arrayBuffer(), { status: resposta.status, headers: saida });
    } catch {
      if (tentativa === 0) {
        await esperar(250);
        continue;
      }
    }
  }
  return jsonErro(502);
}
