import "server-only";
import { mesmaOrigem } from "./mesma-origem";

/* Requisições do navegador devem vir da mesma origem encaminhada pelo proxy
   ou de uma origem explicitamente permitida. Isso bloqueia chamadas diretas
   cross-origin; nenhum cabeçalho identifica de forma infalível um proxy malicioso.
   Na VPS, os routers do Traefik são responsáveis pelos domínios cadastrados. */

const OFICIAIS = (process.env.NEXT_PUBLIC_DOMINIOS_OFICIAIS ?? "")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

function hostPermitido(host: string) {
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) return true;
  return OFICIAIS.some((o) => host === o || host.endsWith(`.${o}`));
}

/**
 * Diz se a requisição veio de uma origem oficial.
 *
 * Sem `NEXT_PUBLIC_DOMINIOS_OFICIAIS` configurado, libera tudo — assim um
 * ambiente novo não se bloqueia sozinho.
 *
 * Requisição SEM `Origin` passa de propósito: apps e ferramentas legítimas
 * não mandam o cabeçalho, e recusá-las quebraria integrações reais. O alvo
 * aqui é o navegador num domínio que não é o seu, que sempre manda.
 */
export function origemOficial(req: Request): boolean {
  // O Traefik encaminha somente os hosts cadastrados no aplicativo. Um novo
  // alias acessa o mesmo checkout sem depender da lista congelada no build.
  // Origin externo divergente do host continua dependendo da lista explícita.
  if (mesmaOrigem(req)) return true;
  if (!OFICIAIS.length) return true;

  const origin = req.headers.get("origin");
  if (!origin) return true;

  try {
    return hostPermitido(new URL(origin).hostname.toLowerCase());
  } catch {
    return false; // Origin malformado: não é navegador legítimo
  }
}
