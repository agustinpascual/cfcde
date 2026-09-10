export const MENSAGEM_PIX_PADRAO = `Olá, {nome}! Seu pedido {pedido} está aguardando o pagamento via Pix.

Valor: {valor}

Copie o código abaixo no aplicativo do seu banco:
{codigo_pix}`;

export const MENSAGEM_CARRINHO_PADRAO = `Olá, {nome}! Separei seu carrinho para você.

Produto: {produto}
Valor: {valor}

Continue a compra com seus dados já preenchidos:
{link}`;

export const VARIAVEIS_PIX = ["nome", "pedido", "valor", "codigo_pix"] as const;
export const VARIAVEIS_CARRINHO = ["nome", "produto", "valor", "link"] as const;

const LIMITE_MENSAGEM = 1600;

export function validarMensagemRecuperacao(valor: unknown, variaveis: readonly string[]) {
  if (typeof valor !== "string") return { ok: false as const, erro: "A mensagem é inválida." };
  const mensagem = valor.trim();
  if (mensagem.length < 10) return { ok: false as const, erro: "A mensagem precisa ter pelo menos 10 caracteres." };
  if (mensagem.length > LIMITE_MENSAGEM) return { ok: false as const, erro: `A mensagem pode ter no máximo ${LIMITE_MENSAGEM} caracteres.` };

  const permitidas = new Set(variaveis);
  const usadas = [...mensagem.matchAll(/\{([^{}]+)\}/g)].map((resultado) => resultado[1]);
  const desconhecida = usadas.find((variavel) => !permitidas.has(variavel));
  if (desconhecida) return { ok: false as const, erro: `A variável {${desconhecida}} não é permitida neste modelo.` };
  return { ok: true as const, mensagem };
}

export function preencherMensagemRecuperacao(modelo: string, dados: Record<string, string | null | undefined>) {
  return modelo.replace(/\{([^{}]+)\}/g, (trecho, chave: string) => dados[chave]?.trim() || trecho);
}

export function primeiroNome(nome: string | null | undefined) {
  return nome?.trim().split(/\s+/)[0] || "cliente";
}

export function numeroWhatsapp(telefone: string | null | undefined) {
  const digitos = (telefone ?? "").replace(/\D/g, "");
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  return digitos;
}
