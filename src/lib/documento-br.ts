/** Valida os dígitos verificadores dos CPF e CNPJ numéricos. */
export function documentoBrasileiroValido(valor: unknown): boolean {
  const documento = String(valor ?? "").replace(/\D/g, "");
  if (!/^(?:\d{11}|\d{14})$/.test(documento) || /^(\d)\1+$/.test(documento)) return false;

  if (documento.length === 11) {
    const digito = (tamanho: 9 | 10) => {
      let soma = 0;
      for (let indice = 0; indice < tamanho; indice++) soma += Number(documento[indice]) * (tamanho + 1 - indice);
      const resto = (soma * 10) % 11;
      return resto === 10 ? 0 : resto;
    };
    return Number(documento[9]) === digito(9) && Number(documento[10]) === digito(10);
  }

  const digito = (base: string, pesos: number[]) => {
    const soma = pesos.reduce((total, peso, indice) => total + Number(base[indice]) * peso, 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const primeiro = digito(documento.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const segundo = digito(`${documento.slice(0, 12)}${primeiro}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return Number(documento[12]) === primeiro && Number(documento[13]) === segundo;
}
