/** Endpoint antigo desativado: não lê, grava ou registra dados de cartão. */
export async function POST() {
  return Response.json({ erro: "Simulador antigo desativado. Testes sem dados de cartão estão disponíveis no painel." },
    { status: 410, headers: { "Cache-Control": "no-store" } });
}
