import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@lumiera/overlays': path.resolve(__dirname, '../remotion-renderer/src/overlays'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5176,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:3005'
    }
  }
})
