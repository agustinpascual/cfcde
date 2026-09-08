import "server-only";
import { ler } from "./config-integracoes";
import { lerPagamentoAxxon } from "./axxonpay-protocolo";

const BASE = "https://api.axxonpay.com.br/api/v1";

export async function chamarAxxon(caminho: string, init: RequestInit = {}) {
  const [publica, secreta] = await Promise.all([ler("AXXONPAY_PUBLIC_KEY"), ler("AXXONPAY_SECRET_KEY")]);
  if (!publica || !secreta) throw new Error("Configure as chaves da AxxonPay em Integrações.");
  const resposta = await fetch(`${BASE}${caminho}`, {
    ...init, cache: "no-store", redirect: "error",
    signal: init.signal ?? AbortSignal.timeout(20000),
    headers: { "content-type": "application/json", "accept": "application/json",
      "axxon-gateway-publickey": publica, "axxon-gateway-secretkey": secreta },
  });
  // Não registra corpo de requisição/resposta, tokens nem dados do comprador.
  if (!resposta.ok) throw Object.assign(new Error(`AxxonPay respondeu HTTP ${resposta.status}.`), { status: resposta.status });
  return resposta.json() as Promise<unknown>;
}

export async function validarAxxon() {
  const r = await chamarAxxon("/tokens/validate", { method: "POST", body: "{}" }) as { status?: string };
  if (r.status !== "ok") throw new Error("AxxonPay não confirmou as credenciais.");
}

export async function configuracaoAdquirenteAxxon() {
  const publica = await ler("AXXONPAY_PUBLIC_KEY");
  if (!publica) throw new Error("Public Key da AxxonPay ausente.");
  const r = await fetch(`https://app.axxonpay.com.br/api/v1/public/gateway-config/public/gateway-config?publicKey=${encodeURIComponent(publica)}`, {
    cache: "no-store", signal: AbortSignal.timeout(10000), redirect: "error",
  });
  if (!r.ok) throw new Error("Não foi possível verificar a adquirente do cartão.");
  const config = await r.json() as { provider?: string };
  // SDK inspecionado: estes fluxos tokenizam sem depender de varredura de
  // campos ocultos do checkout. Outros exigem homologação específica.
  if (!config.provider || !["stripe", "upay"].includes(config.provider.toLowerCase())) {
    throw new Error("Esta adquirente não está habilitada para cartão tokenizado nesta loja. Use um checkout hospedado homologado pela AxxonPay.");
  }
  return { publica, provider: config.provider };
}

export type CriarAxxon = {
  amount: number; paymentMethod: "pix" | "credit_card"; description: string;
  installments?: number; card?: { hash: string };
  customer: { name: string; email: string; phone: string; document: { number: string; type: "cpf" | "cnpj" };
    address: { street: string; number: string; neighborhood: string; city: string; state: string; zipCode: string } };
  metadata: { external_reference: string }; postbackUrl: string;
};
export async function criarPagamentoAxxon(dados: CriarAxxon) {
  return lerPagamentoAxxon(await chamarAxxon("/direct/payment", { method: "POST", body: JSON.stringify(dados) }));
}
export async function consultarPagamentoAxxon(id: string, signal?: AbortSignal) {
  if (!/^[a-zA-Z0-9_-]{4,58}$/.test(id)) throw new Error("ID inválido");
  const p = lerPagamentoAxxon(await chamarAxxon(`/payments/${encodeURIComponent(id)}`, { signal }));
  if (p.id !== id) throw new Error("ID de pagamento divergente");
  return p;
}
