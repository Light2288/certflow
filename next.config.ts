import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configure external packages that should only run on server
  serverExternalPackages: ['ollama'],
};

export default nextConfig;
