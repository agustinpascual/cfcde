/* Máscaras e validações dos campos brasileiros do checkout.
   Tudo roda no navegador — nada é enviado ou persistido. */

export const soDigitos = (v: string) => v.replace(/\D/g, "");

export function mascaraCpfCnpj(v: string) {
  const d = soDigitos(v).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
  }
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export function mascaraCelular(v: string) {
  const d = soDigitos(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

export function mascaraNascimento(v: string) {
  const d = soDigitos(v).slice(0, 8);
  return d.replace(/^(\d{2})(\d)/, "$1/$2").replace(/^(\d{2})\/(\d{2})(\d)/, "$1/$2/$3");
}

export const mascaraCep = (v: string) => {
  const d = soDigitos(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

/* Dígitos verificadores de CPF */
function cpfValido(d: string) {
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (base: string, pesoInicial: number) => {
    const soma = [...base].reduce((a, n, i) => a + Number(n) * (pesoInicial - i), 0);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(d.slice(0, 9), 10) === Number(d[9]) && dv(d.slice(0, 10), 11) === Number(d[10]);
}

/* Dígitos verificadores de CNPJ */
function cnpjValido(d: string) {
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const dv = (base: string) => {
    let peso = base.length - 7;
    const soma = [...base].reduce((a, n) => {
      a += Number(n) * peso--;
      if (peso < 2) peso = 9;
      return a;
    }, 0);
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(d.slice(0, 12)) === Number(d[12]) && dv(d.slice(0, 13)) === Number(d[13]);
}

export function documentoValido(v: string) {
  const d = soDigitos(v);
  return d.length === 11 ? cpfValido(d) : d.length === 14 ? cnpjValido(d) : false;
}

export function nascimentoValido(v: string) {
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return false;
  const [, dia, mes, ano] = m.map(Number);
  const d = new Date(ano, mes - 1, dia);
  if (d.getDate() !== dia || d.getMonth() !== mes - 1 || d.getFullYear() !== ano) return false;
  const idade = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
  return idade >= 18 && idade <= 110;
}

export const celularValido = (v: string) => /^\d{10,11}$/.test(soDigitos(v));
export const emailValido = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
export const nomeValido = (v: string) => v.trim().split(/\s+/).length >= 2 && v.trim().length >= 5;
