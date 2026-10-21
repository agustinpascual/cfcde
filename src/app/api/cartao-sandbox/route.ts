/** Simulador de cartão para estudo. Só aceita cartões de teste e não grava nem registra nada. */
export async function POST(req: Request) {
  const headers = { "Cache-Control": "no-store" };

  // Interruptor: só funciona se a variável estiver ligada
  if (process.env.HABILITAR_SIMULADOR !== "true") {
    return Response.json({ erro: "Indisponível" }, { status: 404, headers });
  }

  let numero = "";
  try {
    const body = await req.json();
    numero = String(body?.numero ?? "").replace(/\D/g, "");
  } catch {
    return Response.json({ erro: "Requisição inválida" }, { status: 400, headers });
  }

  const cenarios: Record<string, { status: number; corpo: object }> = {
    "4111111111111111": { status: 200, corpo: { resultado: "aprovado" } },
    "4000000000000002": { status: 402, corpo: { resultado: "recusado" } },
    "4000000000009995": { status: 402, corpo: { resultado: "saldo_insuficiente" } },
  };

  const r = cenarios[numero];
  if (!r) {
    return Response.json({ erro: "Use um cartão de teste" }, { status: 400, headers });
  }

  return Response.json(r.corpo, { status: r.status, headers });
}