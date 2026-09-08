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
};

export default worker;
