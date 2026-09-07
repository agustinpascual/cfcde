import "server-only";

/* Defesa contra clone que funciona no SERVIDOR.

   O caso real: alguém sobe "loja-clonada.com" como proxy reverso do seu site.
   A trava de domínio em JavaScript pega isso (o navegador sabe que está em
   loja-clonada.com), mas o clonador pode apagar aquele script do HTML que ele
   serve. O que ele NÃO controla é o cabeçalho `Origin`: quem envia é o próprio
   navegador da vítima, em toda requisição do checkout.

   Então mesmo que o clone fique de pé, ele não consegue criar cobrança na sua
   conta da PinPay — que é o que realmente dói. */

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
  if (!OFICIAIS.length) return true;

  const origin = req.headers.get("origin");
  if (!origin) return true;

  try {
    return hostPermitido(new URL(origin).hostname.toLowerCase());
  } catch {
    return false; // Origin malformado: não é navegador legítimo
  }
}
