import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  // Allow Ollama connections from the server
  serverExternalPackages: ["openai"],
};

export default nextConfig;
