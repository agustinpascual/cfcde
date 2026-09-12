import { ipDe, excedeu } from "@/lib/limite";
import { origemOficial } from "@/lib/origem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE = "https://api.bloopi.io/functions/v1";
const CAMINHOS = new Set(["initiate-3ds", "confirm-payment", "submit-card-payment"]);
const LIMITE_CORPO = 24 * 1024;

const jsonErro = (status: number) => Response.json(
  { error: "Não foi possível continuar a autenticação segura." },
  { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
);

/**
 * Repasse one-shot das etapas mutáveis do SDK Bloopi.
 *
 * Não há retry aqui: iniciar ou confirmar uma sessão pode produzir efeito no
 * provedor mesmo quando a resposta se perde. O checkout consulta o pagamento
 * após qualquer falha, então uma resposta incerta nunca dispara outro POST.
 * O corpo não é analisado, registrado nem persistido; ele é encaminhado uma
 * única vez e descartado. Isso também cobre confirm-payment, que contém os
 * dados do cartão exigidos pela adquirente Bloopi.
 */
export async function POST(req: Request, contexto: { params: Promise<{ path: string }> }) {
  if (!origemOficial(req)) return jsonErro(403);
  if (excedeu(`bloopi-envio:${ipDe(req)}`, 12, 60_000)) return jsonErro(429);
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return jsonErro(415);

  const caminho = (await contexto.params).path;
  if (!CAMINHOS.has(caminho)) return jsonErro(404);

  const publica = req.headers.get("x-public-key")?.trim() ?? "";
  const segredo = req.headers.get("x-checkout-secret")?.trim() ?? "";
  if (!/^[A-Za-z0-9_-]{8,300}$/.test(publica) || segredo.length < 8 || segredo.length > 1000) return jsonErro(400);

  let corpo: string;
  try {
    corpo = await req.text();
    if (!corpo || corpo.length > LIMITE_CORPO) return jsonErro(413);
    const json = JSON.parse(corpo);
    if (!json || typeof json !== "object" || Array.isArray(json)) return jsonErro(400);
  } catch {
    return jsonErro(400);
  }

  try {
    const resposta = await fetch(`${BASE}/${caminho}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-public-key": publica,
        "x-checkout-secret": segredo,
      },
      body: corpo,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(caminho === "confirm-payment" ? 35_000 : 20_000),
    });
    if (resposta.status >= 300 && resposta.status < 400) return jsonErro(502);

    const headers = new Headers({
      "Content-Type": resposta.headers.get("content-type") ?? "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    const codigoPlataforma = resposta.headers.get("sb-error-code");
    if (codigoPlataforma) headers.set("sb-error-code", codigoPlataforma);
    return new Response(await resposta.arrayBuffer(), { status: resposta.status, headers });
  } catch {
    return jsonErro(502);
  }
}
