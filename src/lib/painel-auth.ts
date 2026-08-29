import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";

/* Proteção do painel por e-mail + senha em variáveis de ambiente.
   O cookie guarda um HMAC do e-mail + prazo de validade — nunca a senha.
   Simples de operar; para vários usuários, o caminho é o Supabase Auth. */
const COOKIE = "bb_painel";
const DURACAO = 60 * 60 * 12; // 12 horas

const segredo = () => process.env.PAINEL_SENHA ?? "";
export const emailAdmin = () => (process.env.PAINEL_EMAIL ?? "").trim().toLowerCase();

function assinar(exp: number, email: string) {
  return crypto.createHmac("sha256", segredo()).update(`${exp}|${email}`).digest("hex");
}

/* base64url em vez de encodeURIComponent: o e-mail contém pontos
   ("gmail.com") e eles quebravam o split de três partes do cookie. */
const paraB64 = (v: string) => Buffer.from(v, "utf8").toString("base64url");
const deB64 = (v: string) => Buffer.from(v, "base64url").toString("utf8");

export function criarSessao(email: string) {
  const exp = Math.floor(Date.now() / 1000) + DURACAO;
  return { valor: `${exp}.${paraB64(email)}.${assinar(exp, email)}`, maxAge: DURACAO };
}

export function sessaoValida(bruto: string | undefined): boolean {
  if (!segredo() || !emailAdmin() || !bruto) return false;
  const partes = bruto.split(".");
  if (partes.length !== 3) return false;
  const [expTxt, emailCodificado, assinatura] = partes;
  const exp = Number(expTxt);
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return false;

  let email: string;
  try { email = deB64(emailCodificado); } catch { return false; }
  if (email !== emailAdmin()) return false; // e-mail trocado no env invalida a sessão

  const a = Buffer.from(assinar(exp, email)), b = Buffer.from(assinatura ?? "");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function autenticado() {
  const jar = await cookies();
  return sessaoValida(jar.get(COOKIE)?.value);
}

export const NOME_COOKIE = COOKIE;
export const painelConfigurado = () => Boolean(segredo() && emailAdmin());
