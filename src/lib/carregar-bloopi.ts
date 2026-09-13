// Somente JavaScript público, sem dados de cartão ou criação de sessão 3DS.
const BLOOPI_URL = "/api/pagamentos/sdk/bloopi?v=3ds-contexto-20260912";
let carregamento: Promise<void> | null = null;

export function carregarBloopiPeloSite(): Promise<void> {
  if (typeof window.Bloopi === "function") return Promise.resolve();
  if (carregamento) return carregamento;

  carregamento = new Promise<void>((resolve, reject) => {
    const anterior = document.querySelector<HTMLScriptElement>(`script[src="${BLOOPI_URL}"]`);
    const script = anterior ?? document.createElement("script");
    const limpar = () => {
      window.clearTimeout(timeout);
      script.removeEventListener("load", concluir);
      script.removeEventListener("error", falhar);
    };
    const falhar = () => {
      limpar();
      script.remove();
      reject(new Error("Não foi possível carregar o ambiente seguro pelo site."));
    };
    const concluir = () => {
      if (typeof window.Bloopi !== "function") return falhar();
      limpar();
      resolve();
    };
    // Timeout também remove a tag incompleta: a próxima tentativa pode
    // baixar novamente, em vez de esperar um evento que não virá mais.
    const timeout = window.setTimeout(falhar, 15000);
    script.addEventListener("load", concluir, { once: true });
    script.addEventListener("error", falhar, { once: true });
    if (!anterior) {
      script.src = BLOOPI_URL;
      script.async = true;
      script.dataset.pagamentoSeguro = "bloopi";
      document.head.appendChild(script);
    }
  }).catch(erro => {
    carregamento = null;
    throw erro;
  });
  return carregamento;
}
