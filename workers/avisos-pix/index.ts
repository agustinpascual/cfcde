/* Agendador dos avisos de PIX pendente.

   Existe como Worker separado porque o worker gerado pelo OpenNext
   (.open-next/worker.js) exporta só `fetch` — não tem handler `scheduled`,
   então um Cron Trigger apontado para ele não dispararia nada. E como aquele
   arquivo é regerado a cada build, não adianta editá-lo à mão.

   Este aqui só bate na rota do site com o mesmo Bearer que ela já exige
   (src/app/api/cron/avisos-pix/route.ts). */

interface Env {
  SITE_URL: string;
  CRON_SECRET: string;
}

/* Tipos mínimos do runtime da Cloudflare, declarados aqui de propósito.
   Instalar @cloudflare/workers-types puxaria as globais de Worker para o
   projeto inteiro — o tsconfig do app varre todos os .ts da pasta — e este
   arquivo usa só o waitUntil. */
type ExecutionContext = { waitUntil(promessa: Promise<unknown>): void };
type ScheduledController = { cron: string; scheduledTime: number };

export default {
  async scheduled(_evento: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(dispararAvisos(env));
  },

  /* Um GET manual serve para testar sem esperar as 12h UTC. Responde o mesmo
     que a rota respondeu, para o erro aparecer aqui em vez de sumir no log. */
  async fetch(_req: Request, env: Env) {
    const r = await dispararAvisos(env);
    return new Response(r.corpo, { status: r.status });
  },
};

async function dispararAvisos(env: Env) {
  const alvo = `${env.SITE_URL.replace(/\/$/, "")}/api/cron/avisos-pix`;
  const resposta = await fetch(alvo, {
    headers: { authorization: `Bearer ${env.CRON_SECRET}` },
  });
  const corpo = await resposta.text();

  if (!resposta.ok) console.error(`[avisos-pix] ${resposta.status} em ${alvo}: ${corpo}`);
  else console.log(`[avisos-pix] ok: ${corpo}`);

  return { status: resposta.status, corpo };
}
