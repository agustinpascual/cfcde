import { NextResponse } from "next/server";

const ORIGENS = [
  // Origem publicada pela configuração da AxxonPay. O antigo js.bloopi.io
  // não possui DNS e fazia cada cache frio esperar o timeout antes do fallback.
  "https://app.bloopi.io/bloopi.js",
];

let cache: { codigo: string; atualizadoEm: number } | null = null;
let download: Promise<string> | null = null;
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
        /* O contrato público da Safe2Pay exige quatro booleanos no Init. A
           sessão da Bloopi normalmente já os fornece; se vierem ausentes ou
           parciais, normaliza somente esses campos públicos em vez de deixar
           o SDK lançar TypeError antes mesmo de consultar o emissor. O 3DS
           continua obrigatório e nenhum fallback sem autenticação é criado. */
        .replace(
          "  BloopiSDK.prototype._initializeSafe2Pay = function (session, amount) {",
          `  function safe2PayConfigForSession(session, sdkConfig) {
    var provided = session && (session.mpi_config || session.safe2pay_config);
    var config = provided && typeof provided === "object" && !Array.isArray(provided)
      ? Object.assign({}, provided)
      : {};
    if (typeof config.IsEnabled !== "boolean") config.IsEnabled = true;
    if (typeof config.IsSandbox !== "boolean") {
      config.IsSandbox = !!(session && typeof session.is_sandbox === "boolean"
        ? session.is_sandbox
        : sdkConfig && sdkConfig.is_sandbox);
    }
    if (typeof config.IsDebug !== "boolean") config.IsDebug = false;
    if (typeof config.IsChallengeSuppressed !== "boolean") config.IsChallengeSuppressed = false;
    if (!config.OrderNumber && session && session.session_id) config.OrderNumber = session.session_id;
    return config;
  }

  BloopiSDK.prototype._initializeSafe2Pay = function (session, amount) {`,
        )
        .replaceAll(
          "mpi.Init(session.mpi_config || session.safe2pay_config || {}, amount / 100);",
          "mpi.Init(safe2PayConfigForSession(session, self.config), amount / 100);",
        )
        .replaceAll(
          "mpi.Init(session.mpi_config || session.safe2pay_config, amount / 100);",
          `browserReporter.report("mpi_init_started");
        mpi.Init(safe2PayConfigForSession(session, self.config), amount / 100);`,
        )
        .replace(
          `var paymentPromise = initPromise
      .then(function () {
        self._marlimDfpLoad = loadMarlimDfpTag(self._marlimDfpId, !!self.config.is_sandbox);
        if (matchingPreparation) return matchingPreparation;
        return self._getPaymentIntentContext(params);`,
          // Contexto usa somente publicKey, intent e segredo; não depende da
          // configuração nem do download do MPI. As duas leituras começam
          // juntas, mas iniciar sessão continua aguardando AMBAS. Não repete
          // preparação existente, não antecipa POST nem troca o PSP escolhido.
          `if (!matchingPreparation) emit3dsState("context_started");
    var contextPromise = matchingPreparation || self._getPaymentIntentContext(params);
    var paymentPromise = Promise.all([initPromise, contextPromise])
      .then(function (prepared) {
        self._marlimDfpLoad = loadMarlimDfpTag(self._marlimDfpId, !!self.config.is_sandbox);
        return prepared[1];`,
        )
        .replace(
          `if (context && context.psp === "paytime") {
          return self._submitPaytimeCard(params, context);
        }
        return self._initiateSession(params);`,
          `if (context && context.psp === "paytime") {
          return self._submitPaytimeCard(params, context);
        }
        emit3dsState("session_started");
        return self._initiateSession(params);`,
        )
        .replace(
          `.then(function (session) {
        if (session && session.__paytime) return session;
        cspReporter.setSession(session && session.session_id);`,
          `.then(function (session) {
        if (session && session.__paytime) return session;
        emit3dsState("session_ready");
        cspReporter.setSession(session && session.session_id);`,
        )
        /* Expõe apenas nomes fechados de etapas (nunca mensagem, cartão ou
           segredo) para o checkout distinguir sessão, MPI, desafio e banco. */
        .replace(
          `report: function (event, code, message) {
        if (!sessionId) return;`,
          `report: function (event, code, message) {
        var visibleEvents = {
          session_ready: true, script_loaded: true, script_load_failed: true,
          mpi_init_started: true, mpi_ready: true, checkout_started: true,
          challenge_presented: true, challenge_removed: true,
          mpi_error: true, authentication_succeeded: true,
          authentication_failed: true, authentication_disabled: true,
          unsupported_brand: true, success_incomplete: true,
          authentication_timeout: true, authentication_timeout_before_challenge: true,
          authentication_timeout_after_challenge: true, confirm_started: true
        };
        if (visibleEvents[event]) emit3dsState("provider_" + event);
        if (!sessionId) return;`,
        )
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
          || !codigo.includes('var safe2PayReady = !!(window.Safe2Pay && window.Safe2Pay.Mpi)')
          || !codigo.includes("function safe2PayConfigForSession")
          || !codigo.includes('emit3dsState("context_started")')
          || !codigo.includes("Promise.all([initPromise, contextPromise])")
          || !codigo.includes('emit3dsState("session_started")')
          || !codigo.includes('emit3dsState("session_ready")')
          || !codigo.includes('emit3dsState("provider_" + event)')) {
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
    // Checkouts simultâneos compartilham o download do SDK público no cache
    // frio. A promessa é liberada inclusive em falhas, permitindo nova tentativa.
    if ((!cache || Date.now() - cache.atualizadoEm >= UMA_HORA) && !download) {
      download = baixar().finally(() => { download = null; });
    }
    const codigo = cache && Date.now() - cache.atualizadoEm < UMA_HORA
      ? cache.codigo
      : await download!;
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
