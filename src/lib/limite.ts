import "server-only";

/* Limitador de taxa em memória, por IP.
   Ressalva: em serverless a memória é por instância, então o teto real é
   por instância, não global. Segura abuso casual; para proteção forte o
   caminho é Upstash/Redis compartilhado. */
type Janela = { ate: number; contagem: number };
const mapa = new Map<string, Janela>();

export function ipDe(req: Request) {
  const h = req.headers;
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "desconhecido"
  );
}

/** Retorna true quando a requisição deve ser BLOQUEADA. */
export function excedeu(chave: string, limite: number, janelaMs: number) {
  const agora = Date.now();
  const atual = mapa.get(chave);

  if (!atual || atual.ate < agora) {
    mapa.set(chave, { ate: agora + janelaMs, contagem: 1 });
    if (mapa.size > 5000) {
      // poda entradas vencidas para a memória não crescer sem limite
      for (const [k, v] of mapa) if (v.ate < agora) mapa.delete(k);
    }
    return false;
  }

  atual.contagem += 1;
  return atual.contagem > limite;
}
