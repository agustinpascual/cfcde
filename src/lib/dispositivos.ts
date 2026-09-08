export const GRUPOS_DISPOSITIVOS = [
  { id: "celular", rotulo: "Celulares", valores: ["mobile", "iphone", "android"] },
  { id: "computador", rotulo: "Computadores", valores: ["desktop", "windows", "mac", "linux"] },
  { id: "tablet", rotulo: "Tablets", valores: ["tablet", "ipad", "android_tablet"] },
] as const;

export type GrupoDispositivo = typeof GRUPOS_DISPOSITIVOS[number]["id"] | "outros";

export function agruparDispositivo(valor: string | null | undefined): GrupoDispositivo {
  return GRUPOS_DISPOSITIVOS.find((grupo) =>
    (grupo.valores as readonly string[]).includes(valor ?? ""),
  )?.id ?? "outros";
}

export function contarDispositivos(sessoes: readonly { dispositivo: string | null }[]) {
  const totais: Record<GrupoDispositivo, number> = { celular: 0, computador: 0, tablet: 0, outros: 0 };
  for (const sessao of sessoes) totais[agruparDispositivo(sessao.dispositivo)]++;
  return totais;
}
