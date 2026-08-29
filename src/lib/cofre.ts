import "server-only";
import crypto from "node:crypto";

/* Cifra os segredos antes de guardá-los no banco.
   AES-256-GCM: além de cifrar, o tag autentica — valor adulterado no banco
   falha ao decifrar em vez de virar lixo silencioso.
   A CHAVE_MESTRA fica em variável de ambiente e nunca no banco: se ela
   também estivesse lá, cifrar não protegeria de nada. */

const ALG = "aes-256-gcm";

function chave() {
  const bruta = process.env.CHAVE_MESTRA;
  if (!bruta || bruta.length < 32) {
    throw new Error("CHAVE_MESTRA ausente ou curta demais (mínimo 32 caracteres)");
  }
  // deriva 32 bytes estáveis a partir do texto informado
  return crypto.createHash("sha256").update(bruta).digest();
}

export const temChaveMestra = () => {
  const b = process.env.CHAVE_MESTRA;
  return Boolean(b && b.length >= 32);
};

export function cifrar(texto: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv(ALG, chave(), iv);
  const dado = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return [iv.toString("base64"), c.getAuthTag().toString("base64"), dado.toString("base64")].join(":");
}

export function decifrar(pacote: string): string | null {
  try {
    const [iv, tag, dado] = pacote.split(":");
    if (!iv || !tag || !dado) return null;
    const d = crypto.createDecipheriv(ALG, chave(), Buffer.from(iv, "base64"));
    d.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([d.update(Buffer.from(dado, "base64")), d.final()]).toString("utf8");
  } catch {
    return null; // chave trocada ou valor adulterado
  }
}

/** Mostra só as pontas — o painel nunca recebe o segredo inteiro. */
export function mascarar(valor: string) {
  if (!valor) return "";
  if (valor.length <= 12) return `${valor.slice(0, 2)}${"•".repeat(6)}`;
  return `${valor.slice(0, 7)}${"•".repeat(10)}${valor.slice(-4)}`;
}
