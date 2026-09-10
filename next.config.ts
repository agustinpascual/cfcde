import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* IDs públicos do Meta Pixel. O fallback mantém o rastreamento ativo também
     nos builds do Cloudflare que não importam arquivos .env.local. Tokens da
     API de Conversões continuam somente cifrados no banco. */
  env: {
    NEXT_PUBLIC_META_PIXEL_ID:
      process.env.NEXT_PUBLIC_META_PIXEL_ID ??
      "1790438962159532,2131505900780686,1617137666619683",
  },
  // Performance
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    // AVIF primeiro (menor), WebP como fallback
    formats: ["image/avif", "image/webp"],
    // larguras usadas pela página (evita gerar variantes inúteis)
    deviceSizes: [390, 640, 768, 1024, 1280, 1440, 1920],
    imageSizes: [16, 18, 26, 32, 50, 55, 60, 72, 98, 114, 130, 133, 341, 712],
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },
  experimental: {
    optimizePackageImports: [],
  },
  // não anuncia a stack
  productionBrowserSourceMaps: false,

  async redirects() {
    return [
      {
        source: "/produtos/combo-plus2027",
        destination: "/produto/box-plus2027",
        permanent: true,
      },
      {
        source: "/produtos/box-plus2027",
        destination: "/produto/box-plus2027",
        permanent: true,
      },
      { source: "/fale-conosco", destination: "/contato", permanent: true },
      { source: "/sobre-nos", destination: "/sobre", permanent: true },
      { source: "/entregas1", destination: "/entregas", permanent: true },
      { source: "/account/login", destination: "/contato", permanent: false },
    ];
  },

  async headers() {
    /* CSP: 'unsafe-inline' em script continua necessário para o bootstrap do
       Next; o resto é fechado. connect-src libera só ViaCEP e Supabase, que
       são os dois destinos que o navegador realmente chama. */
    const base: Record<string, string> = {
      "default-src": "'self'",
      /* connect.facebook.net serve o fbevents.js do Meta Pixel. Sem esta
         liberação a CSP bloqueia o script e o rastreamento morre calado —
         nenhum erro visível, só nenhum evento chegando ao Gerenciador. */
      "script-src": "'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net https://static.cloudflareinsights.com https://app.axxonpay.com.br https://js.stripe.com https://api.upaybrasil.com.br",
      "style-src": "'self' 'unsafe-inline'",
      /* O pixel também funciona por <img> quando o JS está desligado. */
      "img-src": "'self' data: blob: https://www.facebook.com https://connect.facebook.net",
      "font-src": "'self' data:",
      "connect-src": "'self' https://viacep.com.br https://*.supabase.co https://www.facebook.com https://connect.facebook.net https://cloudflareinsights.com https://app.axxonpay.com.br https://api.stripe.com https://api.upaybrasil.com.br",
      "frame-src": "https://www.youtube.com https://www.youtube-nocookie.com https://www.instagram.com https://js.stripe.com https://hooks.stripe.com https://api.upaybrasil.com.br",
      "form-action": "'self'",
      "base-uri": "'self'",
      "frame-ancestors": "'none'",
      "object-src": "'none'",
      "upgrade-insecure-requests": "",
    };
    const montar = (diretivas: Record<string, string>) =>
      Object.entries(diretivas).map(([nome, valor]) => (valor ? `${nome} ${valor}` : nome)).join("; ");
    const csp = montar(base);

    /* Só o checkout recebe o cartão AxxonPay/Bloopi (docs/axxonpay.md). O SDK
       da Axxon carrega o bloopi.js, que roteia o 3DS para um de cinco
       provedores conforme valor e parcelas — os hosts abaixo foram lidos dos
       próprios scripts em 09/09/2026 (o fingerprint da ThreatMetrix usa
       subdomínios aleatórios de online-metrix.net, daí o curinga). Scripts e conexões ficam enumerados
       (é o que impede um script injetado de ler o formulário ou exfiltrar);
       frame-src precisa ser https: porque o desafio 3DS abre um iframe do
       banco emissor, cujo domínio não dá para prever. O Cardinal cria esse
       iframe em branco, injeta nele um form POST para a URL ACS do emissor e
       só então o envia; por isso form-action também precisa aceitar HTTPS no
       checkout. Sem isso o modal abre, mas permanece branco. O resto do site
       segue na política fechada. */
    const cspCheckout = montar({
      ...base,
      "script-src": `${base["script-src"]} https://app.bloopi.io https://js.bloopi.io https://*.online-metrix.net`
        + " https://static.safe2pay.dev https://3ds-nx-js.stone.com.br https://assets.pagseguro.com.br https://sdk.pagseguro.com https://cdn.marlim.co"
        + " https://*.cardinaltrusted.com https://*.cardinalcommerce.com https://m1.openfpcdn.io https://fpjs.dev",
      "connect-src": `${base["connect-src"]} https://api.bloopi.io https://*.online-metrix.net`
        + " https://services.safe2pay.com.br https://mpi.braspag.com.br https://3ds.stone.com.br https://3ds-sdx.stone.com.br https://api.pagar.me"
        + " https://sdk.pagseguro.com https://api.marlim.co https://*.cardinalcommerce.com https://*.cardinaltrusted.com"
        + " https://kg668dbov0.execute-api.us-east-1.amazonaws.com",
      "img-src": `${base["img-src"]} https://*.online-metrix.net`,
      "frame-src": "https:",
      "form-action": "'self' https:",
    });

    const seguranca = [
      { key: "Content-Security-Policy", value: csp },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "X-DNS-Prefetch-Control", value: "off" },
    ];

    return [
      { source: "/:path*", headers: seguranca },
      // Mesma chave declarada depois vence: o checkout troca só a CSP.
      { source: "/checkout/:path*", headers: [{ key: "Content-Security-Policy", value: cspCheckout }] },
      // O link de recuperação carrega um token temporário apenas até o 303.
      // Não permita que o caminho intermediário vire Referer do checkout.
      { source: "/checkout/recuperar/:path*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
      {
        // assets imutáveis com hash de conteúdo servidos pelo /public
        source: "/sites/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        // painel e checkout nunca em cache nem em índice
        source: "/(painel|checkout|pagamento)/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      /* Exceções públicas e sem dados do comprador. A ordem é intencional:
         no Next 16 a última regra substitui Cache-Control da regra geral. */
      {
        source: "/api/pagamentos/config",
        headers: [{ key: "Cache-Control", value: "private, max-age=30, stale-while-revalidate=120" }],
      },
      {
        source: "/api/pagamentos/sdk/bloopi",
        headers: [{ key: "Cache-Control", value: "public, max-age=300, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
