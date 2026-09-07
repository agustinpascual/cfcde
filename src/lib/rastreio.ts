/* Página de rastreamento. Fica isolada aqui — sem "server-only" — porque é
   usada nos três lugares: e-mail (servidor), painel (cliente) e recibo.
   Um único ponto evita que um deles aponte para outro endereço depois. */

export const RASTREIO_BASE = "https://rastreamentos.meucorreiosbr.com/rastreio/";

/** URL de acompanhamento de um código. */
export const urlRastreio = (codigo: string) =>
  RASTREIO_BASE + encodeURIComponent(codigo.trim().toUpperCase());
