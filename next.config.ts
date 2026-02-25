import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  // Allow Ollama connections from the server
  serverExternalPackages: ["openai"],

  // ── Hobby tier optimizations ──

  // Compress responses
  compress: true,

  // Optimize images
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24, // 24h
  },

  // Cache static assets aggressively
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        {
          key: "X-DNS-Prefetch-Control",
          value: "on",
        },
      ],
    },
    {
      source: "/api/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "no-store, max-age=0",
        },
      ],
    },
  ],

  // Enable production source maps for Sentry
  productionBrowserSourceMaps: true,
};

export default nextConfig;
