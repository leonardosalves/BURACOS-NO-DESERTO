import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dashboardRoot = path.resolve(__dirname, '..')
const sharedDir = path.join(dashboardRoot, 'shared')

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // esbuild (default) — Babel estourava heap no App.tsx (~650KB) em produção.
    react(),
  ],
  esbuild: {
    target: 'es2020',
    legalComments: 'none',
  },
  resolve: {
    alias: {
      '@lumiera/overlays': path.resolve(__dirname, '../remotion-renderer/src/overlays'),
      '@lumiera/shared': sharedDir,
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5176,
    strictPort: true,
    fs: {
      allow: [dashboardRoot],
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3005',
        changeOrigin: true,
        timeout: 900000,
        proxyTimeout: 900000,
      },
    }
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor';
          if (
            id.includes('timelineNarrationSync')
            || id.includes('timelineBlockAudioStarts')
            || id.includes('timelineDynamicAssetWords')
            || id.includes('timelineSpeechAlign')
            || id.includes('sceneTimingEngine')
          ) return 'timeline';
          if (id.includes('src/App.tsx')) return 'app-shell';
        },
      },
    },
  },
})
