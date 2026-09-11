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
export const LIMITE_MODELOS_RECUPERACAO = 10;

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

export function validarModelosRecuperacao(valor: unknown, variaveis: readonly string[]) {
  const valores = Array.isArray(valor) ? valor : [valor];
  if (!valores.length) return { ok: false as const, erro: "Adicione pelo menos uma mensagem." };
  if (valores.length > LIMITE_MODELOS_RECUPERACAO) {
    return { ok: false as const, erro: `Use no máximo ${LIMITE_MODELOS_RECUPERACAO} mensagens.` };
  }

  const mensagens: string[] = [];
  for (let indice = 0; indice < valores.length; indice++) {
    const validacao = validarMensagemRecuperacao(valores[indice], variaveis);
    if (!validacao.ok) {
      return { ok: false as const, erro: `Mensagem ${indice + 1}: ${validacao.erro}` };
    }
    mensagens.push(validacao.mensagem);
  }
  return { ok: true as const, mensagens };
}

/* Configurações antigas guardam texto puro; as novas guardam um array JSON.
   Aceitar os dois formatos permite publicar a rotação sem migração no banco. */
export function modelosRecuperacao(valor: string | null | undefined, padrao: string): string[] {
  const atual = valor?.trim();
  if (!atual) return [padrao];
  try {
    const lista = JSON.parse(atual);
    if (Array.isArray(lista)) {
      const mensagens = lista.filter((item): item is string => typeof item === "string")
        .map((item) => item.trim()).filter(Boolean).slice(0, LIMITE_MODELOS_RECUPERACAO);
      if (mensagens.length) return mensagens;
    }
  } catch { /* formato antigo: a própria string é o único modelo */ }
  return [atual];
}

export const serializarModelosRecuperacao = (modelos: readonly string[]) => JSON.stringify(modelos);

/* Distribui as variações por pedido/sessão. A escolha estável evita trocar o
   texto ao reabrir o detalhe ou ao repetir uma tentativa após falha de rede. */
export function escolherModeloRecuperacao(modelos: readonly string[], chave: string): string {
  if (modelos.length <= 1) return modelos[0] ?? "";
  let hash = 2166136261;
  for (let indice = 0; indice < chave.length; indice++) {
    hash ^= chave.charCodeAt(indice);
    hash = Math.imul(hash, 16777619);
  }
  return modelos[(hash >>> 0) % modelos.length];
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
