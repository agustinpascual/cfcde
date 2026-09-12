import { mesmaOrigem } from "@/lib/mesma-origem";

/** Confirma aliases encaminhados para esta aplicação pelo proxy da VPS.
 * POST para o navegador enviar Origin também em requisições same-origin.
 * Não recebe corpo, não modifica dados e não expõe configuração ou segredos. */
export async function POST(req: Request) {
  const permitido = mesmaOrigem(req);
  return Response.json({ permitido }, {
    status: permitido ? 200 : 403,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}
