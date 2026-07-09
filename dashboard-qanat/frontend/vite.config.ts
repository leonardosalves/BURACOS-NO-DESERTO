import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { lumieraBuildStampPlugin } from "./src/vite-plugin-lumiera-build-stamp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dashboardRoot = path.resolve(__dirname, "..");
const sharedDir = path.join(dashboardRoot, "shared");

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    CESIUM_BASE_URL: JSON.stringify("/cesium/"),
  },
  plugins: [
    // esbuild (default) — Babel estourava heap no App.tsx (~650KB) em produção.
    react(),
    lumieraBuildStampPlugin(),
  ],
  esbuild: {
    target: "es2020",
    legalComments: "none",
  },
  resolve: {
    alias: {
      "@lumiera/overlays": path.resolve(
        __dirname,
        "../remotion-renderer/src/overlays"
      ),
      "@lumiera/shared": sharedDir,
      sucrase: path.resolve(__dirname, "node_modules/sucrase"),
    },
  },
  optimizeDeps: {
    include: [
      "sucrase",
      "@lumiera/shared/narrationMatch.js",
      "@lumiera/shared/timelineNarration.js",
      "@lumiera/shared/timelineAudioStarts.js",
      "@lumiera/shared/wordTranscripts.js",
      "@lumiera/shared/bgmMode.js",
    ],
  },
  server: {
    host: "127.0.0.1",
    port: 5176,
    strictPort: true,
    fs: {
      allow: [dashboardRoot],
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3005",
        changeOrigin: true,
        timeout: 900000,
        proxyTimeout: 900000,
      },
      "/lottie_assets": {
        target: "http://127.0.0.1:3005",
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) return "vendor";
        },
      },
    },
  },
});
