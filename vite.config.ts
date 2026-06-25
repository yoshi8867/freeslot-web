import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 개발 시: vite(클라이언트)가 /api·/healthz를 Express(3001)로 프록시.
// 프로덕션: Express가 dist/와 /api를 함께 서빙(프록시 불필요).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/healthz': 'http://localhost:3001',
    },
  },
  build: { outDir: 'dist' },
})
