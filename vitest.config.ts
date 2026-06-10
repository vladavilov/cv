import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mirror the `@/*` path alias from tsconfig so tested modules can use
    // the same imports as application code.
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
