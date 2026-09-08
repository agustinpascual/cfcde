export const GRUPOS_DISPOSITIVOS = [
  { id: "celular", rotulo: "Celulares", valores: ["mobile", "iphone", "android"] },
  { id: "computador", rotulo: "Computadores", valores: ["desktop", "windows", "mac", "linux"] },
  { id: "tablet", rotulo: "Tablets", valores: ["tablet", "ipad", "android_tablet"] },
] as const;

export type GrupoDispositivo = typeof GRUPOS_DISPOSITIVOS[number]["id"] | "outros";

export const TIPOS_DISPOSITIVOS = [
  { id: "iphone", rotulo: "iPhone / iPod", grupo: "celular" },
  { id: "android", rotulo: "Android", grupo: "celular" },
  { id: "mobile", rotulo: "Celular não especificado", grupo: "celular" },
  { id: "windows", rotulo: "Windows", grupo: "computador" },
  { id: "mac", rotulo: "Mac", grupo: "computador" },
  { id: "linux", rotulo: "Linux / ChromeOS", grupo: "computador" },
  { id: "desktop", rotulo: "Computador não especificado", grupo: "computador" },
  { id: "ipad", rotulo: "iPad", grupo: "tablet" },
  { id: "android_tablet", rotulo: "Tablet Android", grupo: "tablet" },
  { id: "tablet", rotulo: "Tablet não especificado", grupo: "tablet" },
] as const;

export function detectarDispositivo(ua: string, plataforma: string | null = null, toques = 0) {
  const base = `${ua} ${plataforma ?? ""}`;
  // iPadOS em modo desktop se apresenta como Macintosh.
  if (/iPad/i.test(base) || (/Macintosh|MacIntel/i.test(base) && toques > 1)) return "ipad";
  if (/iPhone|iPod/i.test(base)) return "iphone";
  if (/Android/i.test(base)) return /Mobile/i.test(ua) ? "android" : "android_tablet";
  if (/Macintosh|Mac OS|MacIntel/i.test(base)) return "mac";
  if (/Windows/i.test(base)) return "windows";
  if (/Linux|CrOS/i.test(base)) return "linux";
  if (/Tablet/i.test(base)) return "tablet";
  if (/Mobi/i.test(base)) return "mobile";
  return "desktop";
}

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
