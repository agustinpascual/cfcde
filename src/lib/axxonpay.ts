import "server-only";
import { ler } from "./config-integracoes";
import { lerCriacaoAxxon, lerConsultaPagamentoAxxon } from "./axxonpay-protocolo";
import type { CartaoBruto } from "./cartao";

const BASE = "https://api.axxonpay.com.br/api/v1";

export async function chamarAxxon(caminho: string, init: RequestInit & { cartao?: boolean } = {}) {
  const [publica, secreta] = await Promise.all([ler("AXXONPAY_PUBLIC_KEY"), ler("AXXONPAY_SECRET_KEY")]);
  if (!publica || !secreta) throw new Error("Configure as chaves da AxxonPay em Integrações.");
  const resposta = await fetch(`${BASE}${caminho}`, {
    ...init, cache: "no-store", redirect: "manual",
    signal: init.signal ?? AbortSignal.timeout(20000),
    headers: { "content-type": "application/json", "accept": "application/json",
      "axxon-gateway-publickey": publica, "axxon-gateway-secretkey": secreta },
  });
  if (resposta.status >= 300 && resposta.status < 400) {
    throw new Error("AxxonPay tentou redirecionar a requisição.");
  }
  // Não registra corpo de requisição/resposta, tokens, cartão nem dados do comprador.
  if (!resposta.ok) {
    // No PIX, somente a rejeição explícita de documento, observada na API,
    // permite encerrar a reserva. Timeout, 5xx e erros desconhecidos são
    // indeterminados. No cartão, qualquer 400 sem ID é recusa sem cobrança:
    // a adquirente valida o cartão na própria criação, e prender o comprador
    // numa tentativa "em conferência" a cada recusa inviabilizaria a venda.
    const criacao = caminho === "/direct/payment" && init.method === "POST";
    const erro = criacao && resposta.status === 400 ? await resposta.json().catch(() => null) : null;
    const semId = criacao && resposta.status === 400 && !erro?.id && !erro?.data?.id;
    const documentoInvalido = semId && erro?.errorMessage === "customer.document: O número do documento (CPF/CNPJ) é inválido.";
    const cartaoRecusado = semId && init.cartao === true;
    throw Object.assign(new Error(`AxxonPay respondeu HTTP ${resposta.status}.`), { status: resposta.status, documentoInvalido, cartaoRecusado });
  }
  return resposta.json() as Promise<unknown>;
}

export async function validarAxxon() {
  const r = await chamarAxxon("/tokens/validate", { method: "POST", body: "{}" }) as { status?: string };
  if (r.status !== "ok") throw new Error("AxxonPay não confirmou as credenciais.");
}

export async function configuracaoAdquirenteAxxon() {
  const publica = await ler("AXXONPAY_PUBLIC_KEY");
  if (!publica) throw new Error("Public Key da AxxonPay ausente.");
  if (configCache?.publica === publica && configCache.ate > Date.now()) {
    return { publica, provider: configCache.provider, modo: configCache.modo };
  }
  const r = await fetch(`https://app.axxonpay.com.br/api/v1/public/gateway-config/public/gateway-config?publicKey=${encodeURIComponent(publica)}`, {
    cache: "no-store", signal: AbortSignal.timeout(10000), redirect: "manual",
  });
  if (r.status >= 300 && r.status < 400) {
    throw new Error("AxxonPay tentou redirecionar a configuração da adquirente.");
  }
  if (!r.ok) throw new Error("Não foi possível verificar a adquirente do cartão.");
  const config = await r.json() as { provider?: string };
  const provider = String(config.provider ?? "").toLowerCase();
  const modo = MODOS_CARTAO[provider];
  if (!modo) throw new Error("Esta adquirente não está homologada para cartão nesta loja.");
  /* A adquirente muda somente pelo painel. Evita consultar a Axxon em cada
     abertura do checkout, que adicionava cerca de um segundo ao cartão. */
  configCache = { publica, provider, modo, ate: Date.now() + 5 * 60_000 };
  return { publica, provider, modo };
}

export type ModoCartaoAxxon = "token" | "cru";
/* SDK inspecionado em 09/09/2026: stripe/upay tokenizam no navegador e o
   servidor recebe só o hash. A Bloopi não tokeniza: a API exige o cartão em
   claro na criação, e o navegador o usa de novo no 3DS (Axxon.handleNextAction).
   O modo "cru" existe por decisão do lojista registrada em docs/axxonpay.md. */
const MODOS_CARTAO: Record<string, ModoCartaoAxxon> = { stripe: "token", upay: "token", bloopi: "cru" };
let configCache: { publica: string; provider: string; modo: ModoCartaoAxxon; ate: number } | null = null;

export type CriarAxxon = {
  amount: number; paymentMethod: "pix" | "credit_card"; description: string;
  installments?: number; card?: { hash: string } | CartaoBruto;
  customer: { name: string; email: string; phone: string; document: { number: string; type: "cpf" | "cnpj" };
    address: { street: string; number: string; neighborhood: string; city: string; state: string; zipCode: string } };
  metadata: { external_reference: string; payment_attempt?: string }; postbackUrl: string;
};
export async function criarPagamentoAxxon(dados: CriarAxxon) {
  return lerCriacaoAxxon(await chamarAxxon("/direct/payment", {
    method: "POST", body: JSON.stringify(dados), cartao: dados.paymentMethod === "credit_card",
  }));
}
export async function consultarPagamentoAxxon(id: string, signal?: AbortSignal) {
  if (!/^[a-zA-Z0-9_-]{4,58}$/.test(id)) throw new Error("ID inválido");
  const p = lerConsultaPagamentoAxxon(await chamarAxxon(`/payments/${encodeURIComponent(id)}`, { signal }));
  if (p.id !== id) throw new Error("ID de pagamento divergente");
  return p;
}
