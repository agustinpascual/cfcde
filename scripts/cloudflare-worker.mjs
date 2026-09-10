import handler from "../.open-next/worker.js";
import { bloqueioRegional } from "./cloudflare-access.mjs";

export * from "../.open-next/worker.js";

const worker = {
  ...handler,
  async fetch(request, env, ctx) {
    const bloqueio = bloqueioRegional(request);
    if (bloqueio) return bloqueio;
    return handler.fetch(request, env, ctx);
  },
  async scheduled(_controller, env, ctx) {
    const segredo = env.CRON_SECRET;
    if (!segredo) {
      console.error("[cron] CRON_SECRET ausente; reconciliação de PIX não executada");
      return;
    }
    const requisicao = new Request("https://cafecomdeusepai.com/api/pix/reconciliar", {
      method: "POST",
      headers: { authorization: `Bearer ${segredo}` },
    });
    ctx.waitUntil((async () => {
      const resposta = await handler.fetch(requisicao, env, ctx);
      if (!resposta.ok) {
        console.error("[cron] reconciliação de PIX falhou", resposta.status);
      }
    })());
  },
};

export default worker;
