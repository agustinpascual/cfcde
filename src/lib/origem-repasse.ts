/**
 * Recupera a origem pública vista pelo comprador, inclusive atrás do Traefik.
 * Deve ser usada somente depois de `origemOficial(req)` validar a requisição.
 */
export function origemParaRepasse(req: Request): string | null {
  const origemRecebida = req.headers.get("origin")?.trim();
  if (origemRecebida) {
    try {
      const url = new URL(origemRecebida);
      if (["http:", "https:"].includes(url.protocol)
          && !url.username && !url.password && url.origin === origemRecebida) {
        return url.origin;
      }
      return null;
    } catch { return null; }
  }

  const primeiro = (valor: string | null) => valor?.split(",")[0]?.trim() ?? "";
  const forwarded = primeiro(req.headers.get("forwarded"));
  const parametroForwarded = (nome: "host" | "proto") => {
    const encontrado = forwarded.match(new RegExp(`(?:^|;)\\s*${nome}=(?:"([^"]+)"|([^;,]+))`, "i"));
    return primeiro(encontrado?.[1] ?? encontrado?.[2] ?? null);
  };

  const urlDaRequisicao = new URL(req.url);
  const host = primeiro(req.headers.get("x-forwarded-host"))
    || parametroForwarded("host")
    || primeiro(req.headers.get("host"))
    || urlDaRequisicao.host;
  const protocolo = primeiro(req.headers.get("x-forwarded-proto"))
    || parametroForwarded("proto")
    || urlDaRequisicao.protocol.replace(":", "");

  if (!host || !["http", "https"].includes(protocolo.toLowerCase())) return null;
  try {
    const publica = new URL(`${protocolo.toLowerCase()}://${host}`);
    if (publica.username || publica.password || publica.host.toLowerCase() !== host.toLowerCase()) return null;
    return publica.origin;
  } catch { return null; }
}
