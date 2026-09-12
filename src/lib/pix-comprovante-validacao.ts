export const LIMITE_COMPROVANTE = 5 * 1024 * 1024;
export const TIPOS_COMPROVANTE = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/** Confere o conteúdo, não apenas a extensão controlada pelo remetente. */
export function tipoComprovante(bytes: Uint8Array): string | null {
  const starts = (...values: number[]) => values.every((v, i) => bytes[i] === v);
  if (bytes.length < 12) return null;
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(137, 80, 78, 71, 13, 10, 26, 10)) return "image/png";
  if (starts(82, 73, 70, 70) && [87, 69, 66, 80].every((v, i) => bytes[i + 8] === v)) return "image/webp";
  if (starts(37, 80, 68, 70, 45)) return "application/pdf";
  return null;
}

export function compararComprovante(
  informado: { nome: string; valor: number; horario: string },
  pedido: { cliente_nome: string | null; valor_centavos: number; criado_em: string },
  now = Date.now(),
) {
  const normalizar = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLowerCase();
  const horario = Date.parse(informado.horario);
  const criado = Date.parse(pedido.criado_em);
  // Conferência de informações declaradas, nunca prova de liquidação nem OCR.
  return {
    nome_compativel: pedido.cliente_nome ? normalizar(informado.nome) === normalizar(pedido.cliente_nome) : null,
    valor_compativel: informado.valor === pedido.valor_centavos,
    horario_compativel: Number.isFinite(horario) && Number.isFinite(criado) && horario >= criado - 300000 && horario <= now + 300000,
  };
}
