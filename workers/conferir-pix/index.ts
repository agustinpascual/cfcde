interface Env {
  SITE: { fetch(request: Request): Promise<Response> };
  SITE_URL: string;
  CRON_SECRET: string;
}

/** Executado no servidor mesmo quando o painel e a tela do cliente estão fechados. */
export async function conferirPagamentos(env: Env) {
  if (!env.CRON_SECRET) throw new Error("CRON_SECRET não configurado no agendador");
  const resposta = await env.SITE.fetch(new Request(
    new URL("/api/pix/reconciliar", env.SITE_URL), {
      method: "POST",
      headers: { "x-cron-secret": env.CRON_SECRET },
      signal: AbortSignal.timeout(55_000),
    },
  ));
  if (!resposta.ok) throw new Error(`Conferência de Pix falhou: HTTP ${resposta.status}`);
  const resultado = await resposta.json() as {
    ok?: boolean; verificados?: number; atualizados?: number; aprovados?: number; erros?: number;
  };
  console.info("[conferir-pix]", JSON.stringify(resultado));
  if (!resultado.ok || resultado.erros) throw new Error("Conferência de Pix terminou com erros; consulte os logs do site");
  return resultado;
}

const worker = {
  async scheduled(_evento: { cron: string; scheduledTime: number }, env: Env) {
    await conferirPagamentos(env);
  },
};

export default worker;
