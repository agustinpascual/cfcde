type SDK = { setPublicKey(key: string): Promise<void>; encrypt(card: unknown): Promise<string> };
type Card = { numero: string; titular: string; mes: number; ano: number; cvv: string };
const initialized = new WeakMap<SDK, Map<string, Promise<void>>>();

// Preserve the device fingerprint created by setPublicKey across retries/remounts.
export function inicializarSdkAxxon(sdk: SDK, key: string): Promise<void> {
  let keys = initialized.get(sdk);
  if (!keys) { keys = new Map(); initialized.set(sdk, keys); }
  let pending = keys.get(key);
  if (!pending) {
    pending = sdk.setPublicKey(key).catch(error => { keys!.delete(key); throw error; });
    keys.set(key, pending);
  }
  return pending;
}

export async function prepararCartaoAxxon(mode: "token" | "cru", sdk: SDK, card: Card) {
  if (mode === "cru") return { cartao: card };
  const cardHash = await sdk.encrypt({ number: card.numero, holderName: card.titular,
    expMonth: String(card.mes).padStart(2, "0"), expYear: String(card.ano), cvv: card.cvv });
  if (typeof cardHash !== "string" || !cardHash.trim() || cardHash.length > 4096) {
    throw new Error("Não foi possível preparar o cartão. Confira os dados e tente novamente.");
  }
  return { cardHash };
}
