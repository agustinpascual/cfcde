/** Mesmo retrato do comprador na criação e no 3DS. Sem cartão ou credenciais. */
export function normalizarCompradorAxxon(entrada: Record<string, unknown>) {
  const texto = (valor: unknown) => typeof valor === "string" ? valor.trim().slice(0, 200).trim() : "";
  const digitos = (valor: unknown) => typeof valor === "string" ? valor.replace(/\D/g, "") : "";
  const e = entrada.endereco && typeof entrada.endereco === "object" && !Array.isArray(entrada.endereco)
    ? entrada.endereco as Record<string, unknown> : {};
  return {
    nome: texto(entrada.nome), email: texto(entrada.email),
    documento: digitos(entrada.documento), celular: digitos(entrada.celular),
    endereco: {
      logradouro: texto(e.logradouro), numero: texto(e.numero), complemento: texto(e.complemento),
      bairro: texto(e.bairro), localidade: texto(e.localidade), uf: texto(e.uf).toUpperCase(), cep: digitos(e.cep),
    },
  };
}

export type CompradorAxxon = ReturnType<typeof normalizarCompradorAxxon>;

/** O contrato Direct Payment aceita estes seis campos de endereço.
 * Complemento permanece no pedido de entrega, pois não faz parte desse contrato. */
export function clienteCriacaoAxxon(c: CompradorAxxon) {
  const e = c.endereco;
  return {
    name: c.nome, email: c.email, phone: c.celular,
    document: { number: c.documento, type: c.documento.length === 11 ? "cpf" as const : "cnpj" as const },
    address: {
      street: e.logradouro, number: e.numero, neighborhood: e.bairro,
      city: e.localidade, state: e.uf, zipCode: e.cep,
    },
  };
}

/** O SDK usa documento string e zip; os valores são os mesmos da criação. */
export function cliente3dsAxxon(c: CompradorAxxon) {
  const cliente = clienteCriacaoAxxon(c);
  const { zipCode, ...address } = cliente.address;
  return { ...cliente, document: cliente.document.number, address: { ...address, zip: zipCode } };
}
