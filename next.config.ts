import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ];
  },

  async headers() {
    /* CSP: 'unsafe-inline' em script continua necessário para o bootstrap do
       Next; o resto é fechado. connect-src libera só ViaCEP e Supabase, que
       são os dois destinos que o navegador realmente chama. */
    const csp = [
      "default-src 'self'",
      /* connect.facebook.net serve o fbevents.js do Meta Pixel. Sem esta
         liberação a CSP bloqueia o script e o rastreamento morre calado —
         nenhum erro visível, só nenhum evento chegando ao Gerenciador. */
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net https://app.axxonpay.com.br https://js.stripe.com https://api.upaybrasil.com.br",
      "style-src 'self' 'unsafe-inline'",
      /* O pixel também funciona por <img> quando o JS está desligado. */
      "img-src 'self' data: blob: https://www.facebook.com https://connect.facebook.net",
      "font-src 'self' data:",
      "connect-src 'self' https://viacep.com.br https://*.supabase.co https://www.facebook.com https://connect.facebook.net https://app.axxonpay.com.br https://api.stripe.com https://api.upaybrasil.com.br",
      "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://www.instagram.com https://js.stripe.com https://hooks.stripe.com https://api.upaybrasil.com.br",
      "form-action 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

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
    ];
  },
};

export default nextConfig;
