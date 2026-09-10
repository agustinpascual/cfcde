import "server-only";
import { ler } from "./config-integracoes";
import { mascarar } from "./cofre";

export type PixelMeta = { id: string; token: string };
export type PixelMetaPainel = { id: string; tokenPreenchido: boolean; tokenAmostra: string };

const idValido = (id: string) => /^\d{8,25}$/.test(id);

function normalizarPixels(valor: unknown): PixelMeta[] {
  if (!Array.isArray(valor)) return [];
  const vistos = new Set<string>();
  const pixels: PixelMeta[] = [];
  for (const item of valor) {
    const id = String(item?.id ?? "").trim();
    const token = String(item?.token ?? "").trim();
    if (!idValido(id) || vistos.has(id)) continue;
    vistos.add(id);
    pixels.push({ id, token });
  }
  return pixels.slice(0, 10);
}

/** Configuração nova do painel; sem ela, preserva os IDs/tokens legados. */
export async function lerPixelsMeta(): Promise<PixelMeta[]> {
  const salvo = await ler("META_PIXELS");
  if (salvo) {
    try { return normalizarPixels(JSON.parse(salvo)); }
    catch { console.error("[marketing] META_PIXELS inválido; usando configuração legada"); }
  }

  const ids = (process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "")
    .split(",").map((id) => id.trim()).filter(idValido);
  const tokens = ((await ler("META_CAPI_TOKEN")) ?? "")
    .split(",").map((token) => token.trim());
  return normalizarPixels(ids.map((id, indice) => ({ id, token: tokens[indice] ?? "" })));
}

export async function pixelsMetaParaPainel(): Promise<PixelMetaPainel[]> {
  return (await lerPixelsMeta()).map(({ id, token }) => ({
    id,
    tokenPreenchido: Boolean(token),
    tokenAmostra: token ? mascarar(token) : "Token não configurado",
  }));
}

export async function configuracaoMarketingPublica() {
  const [pixels, googleTag] = await Promise.all([lerPixelsMeta(), ler("GOOGLE_TAG_ID")]);
  return {
    metaPixelIds: pixels.map(({ id }) => id),
    googleTagId: googleTag?.trim() ?? "",
  };
}

export function validarPixelsMeta(valor: unknown): { ok: true; pixels: PixelMeta[] } | { ok: false; erro: string } {
  if (!Array.isArray(valor) || valor.length > 10) return { ok: false, erro: "Envie no máximo 10 pixels." };
  const ids = new Set<string>();
  const pixels: PixelMeta[] = [];
  for (const item of valor) {
    const id = String(item?.id ?? "").trim();
    const token = String(item?.token ?? "").trim();
    if (!id && !token) continue;
    if (!idValido(id)) return { ok: false, erro: `ID de pixel inválido: ${id || "vazio"}.` };
    if (ids.has(id)) return { ok: false, erro: `O pixel ${id} está repetido.` };
    if (token && (token.length < 20 || token.length > 2000)) return { ok: false, erro: `Token inválido para o pixel ${id}.` };
    ids.add(id);
    pixels.push({ id, token });
  }
  return { ok: true, pixels };
}
