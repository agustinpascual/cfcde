import "server-only";
import { cifrar, decifrar, mascarar, temChaveMestra } from "./cofre";
import { supabaseAdmin } from "./supabase/servidor";

/* Credenciais das integrações.
   Ordem de leitura: banco (editável pelo painel) → variável de ambiente.
   Assim o que já estava em env continua valendo, e o que for salvo pelo
   painel passa a ter precedência. */

export const CHAVES = [
  "PINPAY_TOKEN", "PINPAY_WEBHOOK_SECRET",
  "RESEND_API_KEY", "RESEND_REMETENTE",
  "ZAPI_INSTANCIA", "ZAPI_TOKEN", "ZAPI_CLIENT_TOKEN",
] as const;
export type ChaveConfig = (typeof CHAVES)[number];

/* Estes não são segredos — podem ir e voltar em texto puro. */
const PUBLICOS: ChaveConfig[] = ["RESEND_REMETENTE", "ZAPI_INSTANCIA"];

let cache: { em: number; valores: Map<string, string> } | null = null;
const TTL = 30_000;

async function doBanco(): Promise<Map<string, string>> {
  if (cache && Date.now() - cache.em < TTL) return cache.valores;
  const valores = new Map<string, string>();
  const db = supabaseAdmin();
  if (db && temChaveMestra()) {
    const { data, error } = await db.from("configuracoes").select("chave,valor_cifrado");
    if (error) console.error("[config] leitura:", error.message);
    for (const linha of data ?? []) {
      const v = decifrar(linha.valor_cifrado);
      if (v) valores.set(linha.chave, v);
    }
  }
  cache = { em: Date.now(), valores };
  return valores;
}

export const limparCache = () => { cache = null; };

/** Valor efetivo: o do banco vence; sem ele, cai na variável de ambiente. */
export async function ler(chave: ChaveConfig): Promise<string | undefined> {
  const banco = await doBanco();
  return banco.get(chave) || process.env[chave] || undefined;
}

export async function salvar(chave: ChaveConfig, valor: string, por: string) {
  const db = supabaseAdmin();
  if (!db) throw new Error("Supabase não configurado");
  if (!temChaveMestra()) throw new Error("CHAVE_MESTRA não configurada");

  if (!valor.trim()) {
    await db.from("configuracoes").delete().eq("chave", chave);
  } else {
    await db.from("configuracoes").upsert(
      { chave, valor_cifrado: cifrar(valor.trim()), atualizado_por: por },
      { onConflict: "chave" }
    );
  }
  limparCache();
}

export type EstadoChave = {
  chave: ChaveConfig;
  preenchida: boolean;
  origem: "painel" | "ambiente" | "vazia";
  amostra: string;   // mascarado, ou o valor puro quando não é segredo
  editavel: boolean;
};

/** O que o painel recebe — nunca o segredo inteiro. */
export async function estadoDasChaves(): Promise<EstadoChave[]> {
  const banco = await doBanco();
  return CHAVES.map((chave) => {
    const doPainel = banco.get(chave);
    const doAmbiente = process.env[chave];
    const valor = doPainel || doAmbiente || "";
    const publico = PUBLICOS.includes(chave);
    return {
      chave,
      preenchida: Boolean(valor),
      origem: doPainel ? "painel" : doAmbiente ? "ambiente" : "vazia",
      amostra: valor ? (publico ? valor : mascarar(valor)) : "",
      editavel: temChaveMestra(),
    };
  });
}
