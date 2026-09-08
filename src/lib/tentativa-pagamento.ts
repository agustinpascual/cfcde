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
