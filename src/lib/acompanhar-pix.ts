export type StatusPix = {
  status?: string;
  codigo_rastreio?: string | null;
  pedido?: string | null;
};

/** Consulta imediatamente, a cada 2s e ao voltar do banco, sem chamadas sobrepostas. */
export function acompanharPix(id: string, receber: (dados: StatusPix) => void) {
  let ativo = true;
  let consultando = false;
  let confirmado = false;
  let controle: AbortController | undefined;

  const conferir = async () => {
    if (!ativo || consultando || confirmado || document.visibilityState === "hidden") return;
    consultando = true;
    controle = new AbortController();
    const limite = window.setTimeout(() => controle?.abort(), 10_000);
    try {
      const resposta = await fetch(`/api/pix/${encodeURIComponent(id)}`, {
        cache: "no-store", signal: controle.signal,
      });
      if (!resposta.ok) return;
      const dados = await resposta.json() as StatusPix;
      if (!ativo) return;
      confirmado = dados.status === "approved" || dados.status === "paid";
      if (confirmado) window.clearInterval(intervalo);
      receber(dados);
    } catch { /* A próxima consulta recupera falhas temporárias de rede. */ }
    finally {
      window.clearTimeout(limite);
      consultando = false;
    }
  };

  const intervalo = window.setInterval(() => void conferir(), 2000);
  const aoVoltar = () => { void conferir(); };
  window.addEventListener("focus", aoVoltar);
  window.addEventListener("online", aoVoltar);
  document.addEventListener("visibilitychange", aoVoltar);
  void conferir();

  return () => {
    ativo = false;
    controle?.abort();
    window.clearInterval(intervalo);
    window.removeEventListener("focus", aoVoltar);
    window.removeEventListener("online", aoVoltar);
    document.removeEventListener("visibilitychange", aoVoltar);
  };
}
