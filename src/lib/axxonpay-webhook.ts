/** URL de notificações independente da URL do navegador, inclusive no localhost. */
export function urlWebhookAxxon(siteUrl?: string, webhookUrl?: string): string {
  try {
    const url = webhookUrl
      ? new URL(webhookUrl)
      : new URL("/api/webhooks/axxonpay", siteUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.hash) throw new Error();
    return url.toString();
  } catch {
    throw new Error("Configure AXXONPAY_WEBHOOK_URL com a URL HTTPS pública de notificações. Nenhuma cobrança foi solicitada.");
  }
}
