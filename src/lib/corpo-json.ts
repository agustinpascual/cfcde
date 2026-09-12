import "server-only";

export class ErroCorpo extends Error {
  constructor(public readonly status: number, mensagem: string) {
    super(mensagem);
  }
}

/** Lê JSON com tipo, tamanho declarado e tamanho real validados. */
export async function lerJsonObjeto(
  req: Request,
  maxBytes: number,
): Promise<Record<string, unknown>> {
  const tipo = (req.headers.get("content-type") ?? "").toLowerCase();
  if (!tipo.startsWith("application/json")) throw new ErroCorpo(415, "Conteúdo inválido.");

  const declarado = Number(req.headers.get("content-length"));
  if (Number.isFinite(declarado) && declarado > maxBytes) {
    throw new ErroCorpo(413, "Requisição muito grande.");
  }

  const bruto = await req.text().catch(() => "");
  if (!bruto || new TextEncoder().encode(bruto).byteLength > maxBytes) {
    throw new ErroCorpo(bruto ? 413 : 400, bruto ? "Requisição muito grande." : "JSON inválido.");
  }

  let valor: unknown;
  try { valor = JSON.parse(bruto); }
  catch { throw new ErroCorpo(400, "JSON inválido."); }
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    throw new ErroCorpo(400, "JSON inválido.");
  }
  return valor as Record<string, unknown>;
}
