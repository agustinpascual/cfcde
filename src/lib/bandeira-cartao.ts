export type BandeiraCartao = "visa" | "mastercard" | "elo" | "amex" | "hipercard" | "diners" | "discover" | "jcb";

/** Identificação visual pelo IIN/BIN. Não consulta rede e não determina aprovação. */
export function identificarBandeiraCartao(valor: string): BandeiraCartao | null {
  const numero = valor.replace(/\D/g, "").slice(0, 19);
  if (numero.length < 2) return null;

  // Elo precisa vir antes de Visa/Mastercard porque alguns intervalos se sobrepõem.
  if (/^(4011(78|79)|431274|438935|451416|457393|4576(31|32)|504175|506(699|7\d{2})|509\d{3}|627780|636297|636368|650(03[1-3]|0[3-9]\d|4\d{2}|5\d{2}|7\d{2}|9\d{2})|6516(5[2-9]|[6-7]\d)|6550(0\d|1\d)|65502\d)/.test(numero)) return "elo";
  if (/^(606282|3841)/.test(numero)) return "hipercard";
  if (/^3[47]/.test(numero)) return "amex";
  if (/^(30[0-5]|3[689])/.test(numero)) return "diners";
  if (/^(6011|65|64[4-9])/.test(numero)) return "discover";
  if (/^622\d{3}/.test(numero) && numero.length >= 6) {
    const bin = Number(numero.slice(0, 6));
    if (bin >= 622126 && bin <= 622925) return "discover";
  }
  if (/^35\d{2}/.test(numero) && numero.length >= 4) {
    const prefixo = Number(numero.slice(0, 4));
    if (prefixo >= 3528 && prefixo <= 3589) return "jcb";
  }
  if (/^5[1-5]/.test(numero)) return "mastercard";
  if (/^2\d{3}/.test(numero) && numero.length >= 4) {
    const prefixo = Number(numero.slice(0, 4));
    if (prefixo >= 2221 && prefixo <= 2720) return "mastercard";
  }
  if (/^4/.test(numero)) return "visa";
  return null;
}

export const NOMES_BANDEIRA: Record<BandeiraCartao, string> = {
  visa: "Visa", mastercard: "Mastercard", elo: "Elo", amex: "American Express",
  hipercard: "Hipercard", diners: "Diners Club", discover: "Discover", jcb: "JCB",
};

export const LOGOS_BANDEIRA: Partial<Record<BandeiraCartao, string>> = {
  visa: "/sites/cafecomdeuspai-com-8456844d/checkout/payment-logos/visa.png",
  mastercard: "/sites/cafecomdeuspai-com-8456844d/checkout/payment-logos/mastercard.png",
  elo: "/sites/cafecomdeuspai-com-8456844d/checkout/payment-logos/elo.png",
  amex: "/sites/cafecomdeuspai-com-8456844d/checkout/payment-logos/amex.webp",
  hipercard: "/sites/cafecomdeuspai-com-8456844d/checkout/payment-logos/hipercard.png",
  diners: "/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/images/56-diners.png",
  discover: "/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/images/59-discover.png",
};
