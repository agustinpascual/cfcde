import "server-only";
import { cifrar, decifrar, mascarar, temChaveMestra } from "./cofre";
import { supabaseAdmin } from "./supabase/servidor";

/* Credenciais das integrações.
   Ordem de leitura: banco (editável pelo painel) → variável de ambiente.
   Assim o que já estava em env continua valendo, e o que for salvo pelo
   painel passa a ter precedência. */

export const CHAVES = [
  "PINPAY_TOKEN", "PINPAY_WEBHOOK_SECRET",
  "AXXONPAY_PUBLIC_KEY", "AXXONPAY_SECRET_KEY", "PAGAMENTOS_GATEWAYS",
  "RESEND_API_KEY", "RESEND_REMETENTE",
  "ZAPI_INSTANCIA", "ZAPI_TOKEN", "ZAPI_CLIENT_TOKEN",
  "WHATSAPP_MSG_PIX_PENDENTE", "WHATSAPP_MSG_CARRINHO_ABANDONADO",
  "GEMINI_API_KEY",
  /* Marketing: META_PIXELS guarda a relação ID/token em um único pacote
     cifrado; GOOGLE_TAG_ID é público e vai para o navegador. */
  "META_PIXELS", "GOOGLE_TAG_ID", "GOOGLE_TAGS",
  "BBF_PROVISIONAMENTO_TOKEN", "BBF_PROVISIONAMENTO_URL",
  /* Dados do emitente, usados no recibo de compra. Não são segredos —
     saem impressos no documento que o cliente recebe. */
  "EMPRESA_RAZAO_SOCIAL", "EMPRESA_CNPJ", "EMPRESA_IE",
  "EMPRESA_ENDERECO", "EMPRESA_TELEFONE", "EMPRESA_LOGO",
  /* Correios: cria a encomenda quando o pagamento é aprovado e devolve o
     código de rastreio. A URL é pública; o segredo, não. */
  "CORREIOS_URL", "CORREIOS_SECRET",
  /* Token da API de Conversões da Meta. O ID do pixel é público e mora em
     NEXT_PUBLIC_META_PIXEL_ID; o token, não. */
  "META_CAPI_TOKEN",
] as const;
export type ChaveConfig = (typeof CHAVES)[number];

/* Estes não são segredos — podem ir e voltar em texto puro. */
const PUBLICOS: ChaveConfig[] = [
  "RESEND_REMETENTE", "ZAPI_INSTANCIA", "BBF_PROVISIONAMENTO_URL",
  "EMPRESA_RAZAO_SOCIAL", "EMPRESA_CNPJ", "EMPRESA_IE",
  "EMPRESA_ENDERECO", "EMPRESA_TELEFONE", "EMPRESA_LOGO",
  "CORREIOS_URL",
  "PAGAMENTOS_GATEWAYS",
  "GOOGLE_TAG_ID", "GOOGLE_TAGS",
];

let cache: { em: number; valores: Map<string, string> } | null = null;
let carregamento: Promise<Map<string, string>> | null = null;
const TTL = 30_000;

async function doBanco(): Promise<Map<string, string>> {
  if (cache && Date.now() - cache.em < TTL) return cache.valores;
  /* Um checkout com PIX e cartão pode pedir várias chaves ao mesmo tempo.
     Num isolate frio todas compartilham a mesma leitura, em vez de abrir
     consultas iguais contra o Supabase e aumentar a latência. */
  if (carregamento) return carregamento;
  carregamento = carregarDoBanco();
  try { return await carregamento; }
  finally { carregamento = null; }
}

async function carregarDoBanco(): Promise<Map<string, string>> {
  const db = supabaseAdmin();
  if (!db || !temChaveMestra()) return new Map();

  /* A leitura acontece em rotas críticas (checkout e painel). Um erro curto de
     rede/autenticação do Supabase não pode transformar credenciais existentes
     em "não configuradas". Repete rapidamente e, se o isolate já teve uma
     leitura boa, conserva o último valor conhecido. */
  let ultimaFalha = "erro desconhecido";
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const { data, error } = await db.from("configuracoes").select("chave,valor_cifrado");
    if (!error) {
      const valores = new Map<string, string>();
      let indecifraveis = 0;
      for (const linha of data ?? []) {
        const v = decifrar(linha.valor_cifrado);
        if (v) valores.set(linha.chave, v);
        else indecifraveis++;
      }
      if (indecifraveis) {
        throw new Error("A CHAVE_MESTRA não corresponde às credenciais salvas no painel.");
      }
      cache = { em: Date.now(), valores };
      return valores;
    }
    ultimaFalha = error.message;
    if (tentativa < 2) await new Promise((resolve) => setTimeout(resolve, 100 * (tentativa + 1)));
  }

  if (cache) {
    console.warn("[integracoes] usando último cofre válido após falha temporária:", ultimaFalha);
    return cache.valores;
  }
  console.error("[integracoes] cofre indisponível após 3 tentativas:", ultimaFalha);
  throw new Error("Não foi possível consultar as configurações após 3 tentativas. Tente novamente em instantes.");
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
    const { error } = await db.from("configuracoes").delete().eq("chave", chave);
    if (error) throw new Error("Não foi possível remover a configuração.");
  } else {
    const { error } = await db.from("configuracoes").upsert(
      { chave, valor_cifrado: cifrar(valor.trim()), atualizado_por: por },
      { onConflict: "chave" }
    );
    if (error) throw new Error("Não foi possível salvar a configuração.");
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
