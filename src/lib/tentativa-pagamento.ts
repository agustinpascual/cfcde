/** Identificador aleatório de tentativa; não contém dados pessoais ou de cartão. */
export function tentativaPagamento(produto: string, metodo: "pix" | "cartao") {
  const chave = `cdp:tentativa:${metodo}:${produto}`;
  const existente = sessionStorage.getItem(chave);
  if (existente) return existente;
  const id = crypto.randomUUID();
  sessionStorage.setItem(chave, id);
  return id;
}
export function concluirTentativa(produto: string, metodo: "pix" | "cartao") {
  sessionStorage.removeItem(`cdp:tentativa:${metodo}:${produto}`);
}

/** Não libera tentativas por timeout, conflito de dados ou erro genérico. */
export function liberarTentativaEncerrada(produto: string, metodo: "pix" | "cartao", tentativa: string, resposta: { codigo?: string }) {
  if (resposta.codigo !== "TENTATIVA_ENCERRADA_SEM_COBRANCA") return false;
  const chave = `cdp:tentativa:${metodo}:${produto}`;
  // Uma resposta atrasada não pode apagar a tentativa mais recente.
  if (sessionStorage.getItem(chave) !== tentativa) return false;
  sessionStorage.removeItem(chave);
  return true;
}
