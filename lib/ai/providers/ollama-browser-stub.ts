/**
 * Browser stub for the server-only `ollama` package.
 *
 * The Ollama SDK relies on Node APIs (for example `node:fs`) and can only run
 * server-side. The Ollama tutor flow always executes on the server via the
 * /api/chat route, so this stub replaces the real package in the browser build
 * (configured via `turbopack.resolveAlias` in next.config.ts) to keep Node
 * dependencies out of the client bundle. If it is ever constructed in the
 * browser it throws a clear error.
 */
export class Ollama {
  constructor() {
    throw new Error(
      'The Ollama provider is server-only and cannot run in the browser.'
    );
  }
}
