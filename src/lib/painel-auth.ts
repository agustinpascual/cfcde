import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";

/* Proteção do painel por e-mail + senha em variáveis de ambiente.
   NÃO há tabela de usuários: o admin é o par PAINEL_EMAIL/PAINEL_SENHA.

   A sessão tem uma chave própria: conhecer a senha de login não basta para
   fabricar cookies. CHAVE_MESTRA mantém instalações existentes funcionando,
   mas PAINEL_SESSION_SECRET é o recomendado e pode ser rotacionado sem mexer
   nas integrações. O fallback para a senha existe SOMENTE no desenvolvimento. */
const PRODUCAO = process.env.NODE_ENV === "production";
const COOKIE = PRODUCAO ? "__Host-cdp_painel" : "cdp_painel_dev";
const VERSAO = "v2";
const DURACAO = 60 * 60 * 8; // um turno de trabalho; sem sessão permanente
const TOLERANCIA_RELOGIO = 60;

const segredo = () => process.env.PAINEL_SESSION_SECRET?.trim()
  || process.env.CHAVE_MESTRA?.trim()
  || (!PRODUCAO ? process.env.PAINEL_SENHA?.trim() : "")
  || "";
export const emailAdmin = () => (process.env.PAINEL_EMAIL ?? "").trim().toLowerCase();

function assinar(emitido: number, exp: number, email: string) {
  return crypto.createHmac("sha256", segredo())
    .update(`${VERSAO}|${emitido}|${exp}|${email}`)
    .digest("base64url");
}

export function criarSessao(email: string) {
  const emitido = Math.floor(Date.now() / 1000);
  const exp = emitido + DURACAO;
  return {
    /* O e-mail participa da assinatura, mas não é enviado ao navegador. */
    valor: `${VERSAO}.${emitido}.${exp}.${assinar(emitido, exp, email)}`,
    maxAge: DURACAO,
  };
}

export function sessaoValida(bruto: string | undefined): boolean {
  if (!segredo() || !emailAdmin() || !bruto) return false;
  const partes = bruto.split(".");
  if (partes.length !== 4) return false;
  const [versao, emitidoTxt, expTxt, assinatura] = partes;
  if (versao !== VERSAO) return false;
  const emitido = Number(emitidoTxt);
  const exp = Number(expTxt);
  const agora = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(emitido) || !Number.isSafeInteger(exp)
      || emitido > agora + TOLERANCIA_RELOGIO || exp <= agora
      || exp <= emitido || exp - emitido > DURACAO) return false;

  const email = emailAdmin();
  const a = Buffer.from(assinar(emitido, exp, email)), b = Buffer.from(assinatura ?? "");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function autenticado() {
  const jar = await cookies();
  return sessaoValida(jar.get(COOKIE)?.value);
}

export const NOME_COOKIE = COOKIE;
export const painelConfigurado = () => Boolean(
  segredo().length >= 32
  && emailAdmin()
  && (process.env.PAINEL_SENHA?.trim().length ?? 0) >= 12
);
