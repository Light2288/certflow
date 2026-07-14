import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configure external packages that should only run on server
  serverExternalPackages: ['ollama'],
  turbopack: {
    // The Ollama SDK is server-only (it uses Node APIs like `node:fs`) and is
    // reached lazily through a dynamic import. It is only ever invoked from the
    // server-side /api/chat route, never in the browser, so alias it to an
    // empty module in the browser build to keep it out of the client bundle.
    resolveAlias: {
      ollama: { browser: './lib/ai/providers/ollama-browser-stub.ts' },
    },
  },
};

export default nextConfig;
