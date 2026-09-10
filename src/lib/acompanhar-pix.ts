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
  let proxima: number | undefined;
  const iniciadoEm = Date.now();

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
      if (confirmado && proxima) window.clearTimeout(proxima);
      receber(dados);
    } catch { /* A próxima consulta recupera falhas temporárias de rede. */ }
    finally {
      window.clearTimeout(limite);
      consultando = false;
    }
  };

  /* Bancos normalmente confirmam logo após o cliente voltar do aplicativo.
     Consulta a cada 1 s nos primeiros 30 s; depois volta a 2 s para não
     manter carga desnecessária durante os dez minutos de validade. */
  const agendar = () => {
    if (!ativo || confirmado) return;
    const intervalo = Date.now() - iniciadoEm < 30_000 ? 1000 : 2000;
    proxima = window.setTimeout(async () => { await conferir(); agendar(); }, intervalo);
  };
  const aoVoltar = () => { void conferir(); };
  window.addEventListener("focus", aoVoltar);
  window.addEventListener("online", aoVoltar);
  document.addEventListener("visibilitychange", aoVoltar);
  void conferir();
  agendar();

  return () => {
    ativo = false;
    controle?.abort();
    if (proxima) window.clearTimeout(proxima);
    window.removeEventListener("focus", aoVoltar);
    window.removeEventListener("online", aoVoltar);
    document.removeEventListener("visibilitychange", aoVoltar);
  };
}
