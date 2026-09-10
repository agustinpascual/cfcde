export const FUSO_BRASILIA = "America/Sao_Paulo";

type DataEntrada = string | number | Date;

export function formatarDataBrasilia(valor: DataEntrada, opcoes: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO_BRASILIA, day: "2-digit", month: "2-digit", year: "numeric", ...opcoes,
  }).format(new Date(valor));
}

export function formatarHoraBrasilia(valor: DataEntrada, opcoes: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO_BRASILIA, hour: "2-digit", minute: "2-digit", ...opcoes,
  }).format(new Date(valor));
}

export function formatarDataHoraBrasilia(valor: DataEntrada, opcoes: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO_BRASILIA, day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", ...opcoes,
  }).format(new Date(valor));
}
