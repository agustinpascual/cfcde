/** Confere requisições mutáveis do painel mesmo atrás do proxy da VPS. */
export function mesmaOrigem(req: Request): boolean {
  const valor = req.headers.get("origin");
  if (!valor) return false;

  let origem: URL;
  try { origem = new URL(valor); }
  catch { return false; }
  if (!["http:", "https:"].includes(origem.protocol) || origem.username || origem.password) return false;

  const primeiro = (v: string | null) => v?.split(",")[0]?.trim().toLowerCase() || "";
  const parametroForwarded = (nome: "host" | "proto") => {
    const trecho = req.headers.get("forwarded")?.split(",")[0] ?? "";
    const achou = trecho.match(new RegExp(`(?:^|;)\\s*${nome}=(?:\"([^\"]+)\"|([^;,]+))`, "i"));
    return primeiro(achou?.[1] ?? achou?.[2] ?? null);
  };

  /* req.url pode ser http://localhost:3000 no container. Traefik informa o
     host e protocolo públicos nestes cabeçalhos. */
  const host = primeiro(req.headers.get("x-forwarded-host"))
    || parametroForwarded("host")
    || primeiro(req.headers.get("host"))
    || new URL(req.url).host.toLowerCase();
  if (origem.host.toLowerCase() !== host) return false;

  const protocolo = primeiro(req.headers.get("x-forwarded-proto")) || parametroForwarded("proto");
  return !protocolo || origem.protocol === `${protocolo}:`;
}
