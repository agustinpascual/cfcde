import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const segredo = () => process.env.CHAVE_MESTRA?.trim() ?? "";
const DURACAO = 7 * 86400;
const hmac = (value: string) => createHmac("sha256", segredo()).update(`pix-comprovante:v1:${value}`).digest("base64url");
const ipHash = (ip: string) => ip === "desconhecido" ? "indisponivel" : hmac(`ip:${ip}`);

/** Capacidade limitada a este Pix; nunca enviada pela consulta pública de status. */
export function criarTokenComprovante(id: string, ip: string, now = Date.now()): string | undefined {
  if (segredo().length < 32) return undefined;
  const exp = Math.floor(now / 1000) + DURACAO;
  const payload = `${exp}.${ipHash(ip)}`;
  return `${payload}.${hmac(`${id}:${payload}`)}`;
}

export function validarTokenComprovante(token: string, id: string, ip: string, now = Date.now()): { mesmoIp: boolean | null } | null {
  if (segredo().length < 32 || token.length > 200) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [exp, hash, signature] = parts;
  const seconds = Math.floor(now / 1000);
  if (!/^\d+$/.test(exp) || !Number.isSafeInteger(Number(exp)) || Number(exp) <= seconds || Number(exp) > seconds + DURACAO) return null;
  const expected = Buffer.from(hmac(`${id}:${exp}.${hash}`));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  return { mesmoIp: hash === "indisponivel" || ip === "desconhecido" ? null : hash === ipHash(ip) };
}
