import "server-only";
import { isIP } from "node:net";

export type Localizacao = {
  cidade: string | null;
  uf: string | null;
  pais: string | null;
  latitude: number | null;
  longitude: number | null;
};

const ESTADOS: Record<string, string> = {
  acre: "AC", alagoas: "AL", amapa: "AP", amazonas: "AM", bahia: "BA",
  ceara: "CE", "distrito federal": "DF", "federal district": "DF", "espirito santo": "ES", goias: "GO",
  maranhao: "MA", "mato grosso": "MT", "mato grosso do sul": "MS",
  "minas gerais": "MG", para: "PA", paraiba: "PB", parana: "PR",
  pernambuco: "PE", piaui: "PI", "rio de janeiro": "RJ", "rio grande do norte": "RN",
  "rio grande do sul": "RS", rondonia: "RO", roraima: "RR", "santa catarina": "SC",
  "sao paulo": "SP", sergipe: "SE", tocantins: "TO",
};

function texto(valor: unknown): string | null {
  if (typeof valor !== "string" || !valor.trim()) return null;
  try { return decodeURIComponent(valor).trim().slice(0, 120); }
  catch { return valor.trim().slice(0, 120); }
}

function coordenada(valor: unknown, limite: number): number | null {
  // Number(null) e Number("") são zero: não representam uma localização.
  if (typeof valor !== "number" && (typeof valor !== "string" || !valor.trim())) return null;
  const numero = Number(valor);
  return Number.isFinite(numero) && Math.abs(numero) <= limite ? numero : null;
}

function normalizar(dados: Record<string, unknown>): Localizacao {
  const codigoPais = texto(dados.pais)?.toUpperCase();
  const pais = codigoPais && /^[A-Z]{2}$/.test(codigoPais) && !["XX", "T1"].includes(codigoPais) ? codigoPais : null;
  const regiao = texto(dados.uf);
  const nomeEstado = regiao?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const uf = pais === "BR"
    ? ESTADOS[nomeEstado ?? ""] ?? (Object.values(ESTADOS).includes(regiao?.toUpperCase() ?? "") ? regiao!.toUpperCase() : null)
    : regiao;
  const lat = coordenada(dados.latitude, 90);
  const lng = coordenada(dados.longitude, 180);
  const parValido = lat !== null && lng !== null && !(lat === 0 && lng === 0);
  return { cidade: texto(dados.cidade), uf, pais, latitude: parValido ? lat : null, longitude: parValido ? lng : null };
}

export function localizacaoDosHeaders(h: Headers): Localizacao {
  return normalizar({
    cidade: h.get("cf-ipcity") ?? h.get("x-vercel-ip-city"),
    uf: h.get("cf-region-code") ?? h.get("x-vercel-ip-country-region"),
    pais: h.get("cf-ipcountry") ?? h.get("cf-country") ?? h.get("x-vercel-ip-country"),
    latitude: h.get("cf-iplatitude") ?? h.get("x-vercel-ip-latitude"),
    longitude: h.get("cf-iplongitude") ?? h.get("x-vercel-ip-longitude"),
  });
}

export function localizacaoCompleta(geo: Localizacao) {
  return Boolean(geo.cidade && geo.uf && geo.pais && geo.latitude !== null && geo.longitude !== null);
}

export function complementarLocalizacao(principal: Localizacao, alternativa?: Localizacao | null): Localizacao {
  if (!alternativa || (principal.pais && alternativa.pais && principal.pais !== alternativa.pais)) return principal;
  return {
    cidade: principal.cidade ?? alternativa.cidade,
    uf: principal.uf ?? alternativa.uf,
    pais: principal.pais ?? alternativa.pais,
    latitude: principal.latitude ?? alternativa.latitude,
    longitude: principal.longitude ?? alternativa.longitude,
  };
}

/** Campos ausentes não devem apagar uma localização já salva em outro ping. */
export function camposLocalizacao(geo: Localizacao) {
  return Object.fromEntries(Object.entries(geo).filter(([, valor]) => valor !== null)) as Partial<Localizacao>;
}

export function ipPublico(ip: string): boolean {
  const versao = isIP(ip);
  if (versao === 6) return /^[23]/i.test(ip) && !/^2001:0?db8:/i.test(ip);
  if (versao !== 4) return false;
  const [a, b, c] = ip.split(".").map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0)) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113));
}

// Cache exclusivamente em memória: não aumenta o disco do VPS. Deduplica
// consultas simultâneas e limita também o trabalho pendente por processo.
const cache = new Map<string, { ate: number; geo: Localizacao | null }>();
const pendentes = new Map<string, Promise<Localizacao | null>>();
const MAX_IPS = 2048;

export function localizacaoEmCache(ip: string): Localizacao | null | undefined {
  const entrada = cache.get(ip);
  if (!entrada) return undefined;
  if (entrada.ate <= Date.now()) { cache.delete(ip); return undefined; }
  return entrada.geo;
}

export async function localizarIp(ip: string): Promise<Localizacao | null> {
  if (!ipPublico(ip)) return null;
  const existente = localizacaoEmCache(ip);
  if (existente !== undefined) return existente;
  const pendente = pendentes.get(ip);
  if (pendente) return pendente;
  if (pendentes.size >= 16) return null;

  const consulta = (async () => {
    let geo: Localizacao | null = null;
    try {
      // Somente o IP público vai ao GeoJS; nenhum dado de sessão ou pedido.
      const resposta = await fetch(`https://get.geojs.io/v1/ip/geo/${encodeURIComponent(ip)}.json`, {
        cache: "no-store", redirect: "error", signal: AbortSignal.timeout(1500),
      });
      if (resposta.ok) {
        const dados = await resposta.json();
        if (dados && typeof dados === "object" && !Array.isArray(dados) && !dados.error) {
          geo = normalizar({ cidade: dados.city, uf: dados.region, pais: dados.country_code, latitude: dados.latitude, longitude: dados.longitude });
        }
      }
    } catch { /* Indisponibilidade do provedor não interrompe o rastreamento. */ }
    if (cache.size >= MAX_IPS) cache.delete(cache.keys().next().value!);
    cache.set(ip, { geo, ate: Date.now() + (geo && localizacaoCompleta(geo) ? 6 * 60 * 60_000 : 60_000) });
    return geo;
  })();
  pendentes.set(ip, consulta);
  try { return await consulta; } finally { pendentes.delete(ip); }
}
