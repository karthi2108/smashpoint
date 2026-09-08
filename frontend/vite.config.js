import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// BACKEND_URL lets the same config work locally (default) and inside docker-compose.
const target = process.env.BACKEND_URL || 'http://localhost:8000'
const wsTarget = target.replace(/^http/, 'ws')

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': target,
      '/ws': { target: wsTarget, ws: true },
    },
  },
})
