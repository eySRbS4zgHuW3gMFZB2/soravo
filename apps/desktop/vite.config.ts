import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(rootDir, "./src") } },
  clearScreen: false,
  // R1 floating pill: the Handy-derived `recording_overlay` window loads
  // `src/overlay/index.html` (see `overlay.rs`). A second Rollup entry emits
  // it to `dist/src/overlay/index.html` without touching the main entry.
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(rootDir, "index.html"),
        overlay: path.resolve(rootDir, "src/overlay/index.html"),
      },
    },
  },
  server: { port: 1420, strictPort: true, watch: { ignored: ["**/src-tauri/**"] } }
});
