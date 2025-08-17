import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // When not running netlify dev, allow manual local function dev server on 8888 (if started)
      '/api/gemini': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        // fall back silently if that server isn't up; user should use netlify dev for functions
        configure: (proxy) => { proxy.on('error', () => {}); }
      },
      // Proxy requests intended for the local gemma proxy (we run gemmaProxy on 8889)
      '/api/gemmaProxy': {
        target: 'http://localhost:8889',
        changeOrigin: true,
        configure: (proxy) => { proxy.on('error', () => {}); }
      },
      '/api/gemma': {
        target: 'http://localhost:8889',
        changeOrigin: true,
        configure: (proxy) => { proxy.on('error', () => {}); }
      }
    }
  }
})