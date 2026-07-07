import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

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
    },
  },
  optimizeDeps: {
    include: [
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
          if (id.includes("AppMusicTab")) return "music-tab";
          if (id.includes("AppCreatorTab")) return "creator-tab";
          if (id.includes("AppEditorTab")) return "editor-tab";
          if (id.includes("AppTimelineTab")) return "timeline-tab";
          if (id.includes("AppUploadTab")) return "upload-tab";
          if (id.includes("AppAiTab")) return "ai-tab";
          if (id.includes("AppStatusTab")) return "status-tab";
          if (id.includes("AppSettingsTab")) return "settings-tab";
          if (id.includes("AppHomeTab")) return "home-tab";
          if (id.includes("AppWorkflowTab")) return "workflow-tab";
          if (id.includes("AppSceneTimingTab")) return "scene-timing-tab";
          if (id.includes("AppTerminalTab")) return "terminal-tab";
          if (id.includes("AppMusicTabPanel")) return "music-tab";
          if (id.includes("youtubeMetadataDisplay"))
            return "youtube-metadata-ui";
          if (
            id.includes("TimelineStudio") ||
            id.includes("RichTimelineEditor")
          )
            return "timeline-editor";
          if (id.includes("ListicleCreatorStep")) return "creator-step";
          if (id.includes("SceneTimingEditor")) return "scene-timing";
          if (id.includes("WorkflowToolkit")) return "workflow";
          if (id.includes("OverlayTimelineEditor")) return "overlay-editor";
          if (id.includes("LumieraHomePage")) return "home-page";
          if (id.includes("DashminAiChat")) return "ai-chat";
          if (id.includes("creatorEditorialImport")) return "creator-import";
        },
      },
    },
  },
});
