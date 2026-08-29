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
  async headers() {
    return [
      {
        // assets imutáveis com hash de conteúdo servidos pelo /public
        source: "/sites/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
