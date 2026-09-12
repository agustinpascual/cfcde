import "server-only";
import { isIP } from "node:net";

/* Limitador de taxa em memória, por IP.
   Ressalva: em serverless a memória é por instância, então o teto real é
   por instância, não global. Segura abuso casual; para proteção forte o
   caminho é Upstash/Redis compartilhado. */
type Janela = { ate: number; contagem: number };
const mapa = new Map<string, Janela>();
const MAX_CHAVES = 5000;

function ipValido(valor: string | null): string | null {
  if (!valor) return null;
  const limpo = valor.trim().slice(0, 64);
  return isIP(limpo) ? limpo.toLowerCase() : null;
}

export function ipDe(req: Request) {
  const h = req.headers;
  return (
    // Na Cloudflare o IP real do cliente vem em cf-connecting-ip.
    ipValido(h.get("cf-connecting-ip")) ||
    ipValido(h.get("x-forwarded-for")?.split(",")[0] ?? null) ||
    ipValido(h.get("x-real-ip")) ||
    "desconhecido"
  );
}

/** Retorna true quando a requisição deve ser BLOQUEADA. */
export function excedeu(chave: string, limite: number, janelaMs: number) {
  const agora = Date.now();
  const atual = mapa.get(chave);

  if (!atual || atual.ate < agora) {
    mapa.delete(chave);
    if (mapa.size >= MAX_CHAVES) {
      for (const [k, v] of mapa) if (v.ate < agora) mapa.delete(k);
      /* Limite absoluto de memória. Na borda, a Cloudflare continua sendo a
         camada apropriada para rate limiting distribuído. */
      while (mapa.size >= MAX_CHAVES) {
        const maisAntiga = mapa.keys().next().value as string | undefined;
        if (!maisAntiga) break;
        mapa.delete(maisAntiga);
      }
    }
    mapa.set(chave, { ate: agora + janelaMs, contagem: 1 });
    return false;
  }

  atual.contagem += 1;
  return atual.contagem > limite;
}
