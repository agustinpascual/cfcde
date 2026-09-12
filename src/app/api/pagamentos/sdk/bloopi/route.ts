import { NextResponse } from "next/server";

const ORIGENS = [
  // Origem publicada pela configuração da AxxonPay. O antigo js.bloopi.io
  // não possui DNS e fazia cada cache frio esperar o timeout antes do fallback.
  "https://app.bloopi.io/bloopi.js",
];

let cache: { codigo: string; atualizadoEm: number } | null = null;
const UMA_HORA = 60 * 60 * 1000;

async function baixar() {
  let ultimoErro: unknown;
  for (const origem of ORIGENS) {
    try {
      const resposta = await fetch(origem, {
        cache: "no-store",
        headers: { Accept: "application/javascript" },
        signal: AbortSignal.timeout(8000),
      });
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
      const original = await resposta.text();
      const codigo = original
        .replace('API_BASE + "/checkout-config"', '"/api/pagamentos/bloopi-leitura/checkout-config"')
        .replace('API_BASE + "/get-checkout-info/"', '"/api/pagamentos/bloopi-leitura/get-checkout-info/"')
        /* O intent já existe quando estas chamadas acontecem. Em produção,
           navegadores diferentes encerraram o POST cross-origin antes mesmo
           do challenge. A rota da loja faz um único repasse, sem retry: assim
           preserva a semântica do SDK e nunca confirma duas vezes. */
        .replaceAll('API_BASE + "/initiate-3ds"', '"/api/pagamentos/bloopi-envio/initiate-3ds"')
        .replaceAll('API_BASE + "/confirm-payment"', '"/api/pagamentos/bloopi-envio/confirm-payment"')
        .replaceAll('API_BASE + "/submit-card-payment"', '"/api/pagamentos/bloopi-envio/submit-card-payment"')
        /* O loader oficial considera qualquer <script src=...> como pronto.
           Se o download do MPI Safe2Pay falhou, a tag permanece no DOM sem
           window.Safe2Pay; a tentativa seguinte então retorna imediatamente
           "3DS script not loaded". Remove somente essa tag comprovadamente
           incompleta para que o próprio loader oficial faça um download novo. */
        .replace(
          `if (document.querySelector('script[src="' + src + '"]')) {
        resolve();
        return;
      }`,
          `var existingScript = document.querySelector('script[src="' + src + '"]');
      if (existingScript) {
        var safe2PayScript = src.indexOf("verify_3DS2") >= 0;
        var safe2PayReady = !!(window.Safe2Pay && window.Safe2Pay.Mpi);
        if (!safe2PayScript || safe2PayReady) {
          resolve();
          return;
        }
        existingScript.remove();
      }`,
        );
      if (codigo.length < 1000 || !codigo.includes("Bloopi")) throw new Error("SDK inválido");
      if (codigo === original
          || codigo.includes('API_BASE + "/checkout-config"')
          || codigo.includes('API_BASE + "/get-checkout-info/"')
          || codigo.includes('API_BASE + "/initiate-3ds"')
          || codigo.includes('API_BASE + "/confirm-payment"')
          || codigo.includes('API_BASE + "/submit-card-payment"')
          || !codigo.includes('var safe2PayReady = !!(window.Safe2Pay && window.Safe2Pay.Mpi)')) {
        throw new Error("Contrato do SDK incompatível");
      }
      cache = { codigo, atualizadoEm: Date.now() };
      return codigo;
    } catch (erro) {
      ultimoErro = erro;
    }
  }
  if (cache?.codigo) return cache.codigo;
  throw ultimoErro ?? new Error("SDK indisponível");
}

export async function GET() {
  try {
    const codigo = cache && Date.now() - cache.atualizadoEm < UMA_HORA
      ? cache.codigo
      : await baixar();
    return new NextResponse(codigo, {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("/* ambiente seguro temporariamente indisponível */", {
      status: 503,
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
}
