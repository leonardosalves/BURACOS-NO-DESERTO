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
    react({
      // App.tsx is a large single module; avoid Babel's 500KB "deoptimised" console note.
      babel: {
        generatorOpts: {
          compact: false,
        },
      },
    }),
  ],
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
  }
})
