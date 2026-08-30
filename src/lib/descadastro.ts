import "server-only";
import crypto from "node:crypto";

/* O link de descadastro vai por e-mail e volta sem sessão. Assinar o endereço
   impede que alguém descadastre terceiros só trocando o parâmetro na URL. */
function segredo() {
  const s = process.env.CHAVE_MESTRA;
  if (!s) throw new Error("CHAVE_MESTRA não configurada");
  return s;
}

export const assinarDescadastro = (email: string) =>
  crypto.createHmac("sha256", segredo()).update(`descadastro:${email.toLowerCase()}`).digest("hex").slice(0, 32);

export function conferirDescadastro(email: string, token: string) {
  try {
    const esperado = Buffer.from(assinarDescadastro(email));
    const recebido = Buffer.from(token);
    return esperado.length === recebido.length && crypto.timingSafeEqual(esperado, recebido);
  } catch {
    return false;
  }
}
