import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // In development proxy /api → local backend; in production the frontend
  // calls the deployed backend directly via VITE_API_URL so no proxy needed.
  const backendUrl = env.VITE_API_URL || 'http://localhost:8000'
  return {
    plugins: [react(), tailwindcss()],
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
    server: {
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
  }
})
