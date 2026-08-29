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

  async headers() {
    /* CSP: 'unsafe-inline' em script continua necessário para o bootstrap do
       Next; o resto é fechado. connect-src libera só ViaCEP e Supabase, que
       são os dois destinos que o navegador realmente chama. */
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://viacep.com.br https://*.supabase.co",
      "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://www.instagram.com",
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
