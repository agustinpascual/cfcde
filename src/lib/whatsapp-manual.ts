export const NOME_ATENDIMENTO_PADRAO = "Atendimento";

export function normalizarNomeAtendente(valor: unknown) {
  return typeof valor === "string" ? valor.trim().slice(0, 60) : "";
}

export function formatarRespostaManual(nome: unknown, mensagem: string) {
  const atendente = normalizarNomeAtendente(nome) || NOME_ATENDIMENTO_PADRAO;
  return `${atendente}:\n${mensagem.trim()}`;
}
