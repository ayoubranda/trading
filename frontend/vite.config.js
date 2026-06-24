import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/analyze': { target: 'http://localhost:8000', changeOrigin: true, timeout: 300000 },
      '/elliott':  { target: 'http://localhost:8000', changeOrigin: true, timeout: 300000 },
      '/news':     { target: 'http://localhost:8000', changeOrigin: true, timeout: 300000 },
      '/candles':  { target: 'http://localhost:8000', changeOrigin: true, timeout: 30000 },
      '/confluence':{ target: 'http://localhost:8000', changeOrigin: true, timeout: 30000 },
      '/terminal': { target: 'http://localhost:8000', changeOrigin: true, timeout: 60000 },
      '/health':   { target: 'http://localhost:8000', changeOrigin: true },
    }
  }
})
