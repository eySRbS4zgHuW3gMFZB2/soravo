import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin, ResolvedConfig } from "vite";
import { verifyDist, writeProductionHeaders } from "./scripts/prod-headers.mjs";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// WEB-011 / ADR-014: emit `dist/_headers` from the resolved build environment so
// the Content-Security-Policy exactly matches the resource graph baked into the
// bundle (Supabase/Umami origins are only added when those env-gated features are
// actually configured). `writeBundle` runs after all assets are on disk; the
// dist is then verified against the deployment-readiness invariants so a broken
// production build fails the pipeline.
function productionSecurityHeaders(): Plugin {
  let resolved: ResolvedConfig | null = null;
  return {
    name: "soravo:production-security-headers",
    apply: "build",
    configResolved(config) {
      resolved = config;
    },
    async writeBundle() {
      if (!resolved) return;
      const distDir = path.resolve(resolved.root, resolved.build.outDir);
      await writeProductionHeaders(distDir, resolved.env);
      await verifyDist(distDir);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), productionSecurityHeaders()],
  resolve: { alias: { "@": path.resolve(rootDir, "./src") } },
  server: {
    headers: {
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "DENY",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
  test: { environment: "jsdom", setupFiles: "./src/test-setup.ts" }
});