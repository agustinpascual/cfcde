const normalizar = (valor) => String(valor ?? "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

const dentroDe = (caminho, raiz) => caminho === raiz || caminho.startsWith(`${raiz}/`);

const cidadesBloqueadas = new Set(["itajai", "navegantes", "balneario camboriu"]);

/** Usa metadados confiáveis do Worker, nunca headers enviados pelo visitante. */
export function bloqueioRegional(request) {
  if (request.cf?.country !== "BR" || !cidadesBloqueadas.has(normalizar(request.cf?.city))) return null;

  const caminho = new URL(request.url).pathname;
  // Mantém o painel autenticado e as integrações operacionais. Arquivos
  // compartilhados são necessários para carregar o painel (CSS, JS e imagens).
  const excecoes = ["/ioh3j4ciof3n3oic", "/api/painel", "/api/webhooks", "/api/cron", "/_next", "/sites"];
  if (excecoes.some((raiz) => dentroDe(caminho, raiz))) return null;

  return new Response("Acesso indisponível.", {
    status: 403,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex",
    },
  });
}
