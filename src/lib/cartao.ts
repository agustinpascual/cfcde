/** Cartão em claro, exigido pela adquirente Bloopi via AxxonPay.
 *
 * Decisão do lojista em 09/09/2026 (docs/axxonpay.md): o número, a validade e
 * o CVV passam pelo servidor da loja apenas em trânsito. Este módulo valida e
 * normaliza; quem o chama retira o cartão do corpo antes de qualquer outra
 * leitura, e o objeto resultante só existe para a chamada de criação. Nunca é
 * gravado, registrado em log, devolvido ao navegador nem incluído em erros.
 * Sem "server-only" de propósito: é puro e testado em unidade. */
export type CartaoBruto = {
  number: string; holderName: string; expirationMonth: number; expirationYear: number; cvv: string;
};

/** Parcelas sem juros oferecidas no checkout (a API aceita até 12). */
export const PARCELAS_MAX = 4;

/** Tudo que já foi, ou é, campo de cartão em algum corpo de requisição. */
export const CAMPOS_CARTAO = [
  "cartao", "card", "cardHash", "numeroCartao", "cvv", "nomeCartao",
  "chaveAtivacao", "chaveUsuario", "nascimentoMesAno",
] as const;

export function luhn(digitos: string) {
  if (!/^\d+$/.test(digitos)) return false;
  let soma = 0, dobra = false;
  for (let i = digitos.length - 1; i >= 0; i--) {
    let d = digitos.charCodeAt(i) - 48;
    if (dobra) { d *= 2; if (d > 9) d -= 9; }
    soma += d; dobra = !dobra;
  }
  return soma % 10 === 0;
}

/** Mensagens de erro nunca incluem o valor informado. */
export function validarCartao(entrada: unknown, agora = new Date()): CartaoBruto {
  const c = (entrada && typeof entrada === "object" && !Array.isArray(entrada) ? entrada : {}) as Record<string, unknown>;
  const number = String(c.numero ?? "").replace(/\D/g, "");
  const holderName = String(c.titular ?? "").trim().replace(/\s+/g, " ");
  const expirationMonth = Number(c.mes), expirationYear = Number(c.ano);
  const cvv = String(c.cvv ?? "").replace(/\D/g, "");
  if (number.length < 13 || number.length > 19 || !luhn(number)) throw new Error("Confira o número do cartão.");
  if (holderName.length < 2 || holderName.length > 60 || !/^[\p{L}\p{M}' .-]+$/u.test(holderName)) throw new Error("Informe o nome impresso no cartão.");
  if (!Number.isInteger(expirationMonth) || expirationMonth < 1 || expirationMonth > 12
      || !Number.isInteger(expirationYear) || expirationYear < 2000 || expirationYear > 2099) throw new Error("Confira a validade do cartão.");
  const ano = agora.getFullYear(), mes = agora.getMonth() + 1;
  if (expirationYear < ano || (expirationYear === ano && expirationMonth < mes) || expirationYear > ano + 20) throw new Error("Cartão vencido ou validade inválida.");
  if (cvv.length < 3 || cvv.length > 4) throw new Error("Confira o código de segurança.");
  return { number, holderName, expirationMonth, expirationYear, cvv };
}

/** Cópia rasa do corpo sem nenhum campo de cartão, para o restante do fluxo. */
export function semCartao(body: Record<string, unknown>) {
  const copia: Record<string, unknown> = { ...body };
  for (const campo of CAMPOS_CARTAO) delete copia[campo];
  return copia;
}
