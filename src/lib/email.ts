import "server-only";
import { ler } from "./config-integracoes";

/* Cliente da Resend por HTTP. Um SDK inteiro para dois endpoints não se paga. */

const API = "https://api.resend.com/emails";

/* A Resend aceita até 100 por requisição no endpoint em lote e limita a
   2 requisições por segundo. Lote menor com pausa mantém folga. */
export const LOTE = 50;
export const PAUSA_MS = 700;

export type Destinatario = { email: string; nome?: string | null };
export type ResultadoEnvio = { email: string; id?: string; erro?: string };

export const emailValido = (e: string) =>
  /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e.trim());

/** Normaliza para comparar e deduplicar: minúsculo e sem espaço. */
export const normalizar = (e: string) => e.trim().toLowerCase();

/** Substitui {{nome}} e {{email}} no assunto e no corpo. */
export function preencher(modelo: string, d: Destinatario) {
  const primeiro = (d.nome ?? "").trim().split(/\s+/)[0] || "";
  return modelo
    .replace(/\{\{\s*nome\s*\}\}/gi, primeiro)
    .replace(/\{\{\s*email\s*\}\}/gi, d.email);
}

/**
 * Envia um lote. Devolve um resultado por destinatário — sucesso e falha
 * convivem no mesmo lote, e a campanha precisa saber de qual foi qual.
 */
export async function enviarLote(
  destinatarios: Destinatario[],
  assunto: string,
  html: string,
  urlDescadastro: (email: string) => string
): Promise<ResultadoEnvio[]> {
  const [chave, remetente] = await Promise.all([ler("RESEND_API_KEY"), ler("RESEND_REMETENTE")]);
  if (!chave) throw new Error("RESEND_API_KEY não configurada");
  if (!remetente) throw new Error("RESEND_REMETENTE não configurado");

  const corpo = destinatarios.map((d) => ({
    from: remetente,
    to: [d.email],
    subject: preencher(assunto, d),
    html: preencher(html, d).replace(/\{\{\s*descadastro\s*\}\}/gi, urlDescadastro(d.email)),
    /* Cabeçalho de descadastro em um clique. Gmail e Outlook exigem isso de
       quem manda em volume; sem ele a entrega despenca. */
    headers: {
      "List-Unsubscribe": `<${urlDescadastro(d.email)}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  }));

  const res = await fetch(`${API}/batch`, {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });

  if (!res.ok) {
    const texto = (await res.text()).slice(0, 300);
    return destinatarios.map((d) => ({ email: d.email, erro: `Resend ${res.status}: ${texto}` }));
  }

  const d = await res.json();
  const ids: { id?: string }[] = d?.data ?? [];
  return destinatarios.map((dest, i) => ({ email: dest.email, id: ids[i]?.id }));
}

/** Envio avulso, usado no teste antes do disparo real. */
export async function enviarUm(para: string, assunto: string, html: string) {
  const [chave, remetente] = await Promise.all([ler("RESEND_API_KEY"), ler("RESEND_REMETENTE")]);
  if (!chave || !remetente) throw new Error("Resend não configurada");

  const res = await fetch(API, {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: remetente, to: [para], subject: assunto, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}
