const SITE_PUBLICO = "https://cafecomdeusepai.com";

/** E-mails precisam de URLs públicas, inclusive quando enviados pelo next dev. */
export function sitePublicoEmail(site = process.env.NEXT_PUBLIC_SITE_URL): string {
  try {
    const url = new URL(site ?? SITE_PUBLICO);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password || url.port ||
        host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
        !host.includes(".") || host.includes(":") || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      return SITE_PUBLICO;
    }
    return url.origin;
  } catch {
    return SITE_PUBLICO;
  }
}
