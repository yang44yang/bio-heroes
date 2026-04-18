import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    // Sprint 27: 显式预构建 react-dom（BattleScreen 用 createPortal），修复 504 Outdated Optimize Dep
    include: ['react-dom', 'react', 'react-dom/client', 'framer-motion'],
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'framer': ['framer-motion'],
        },
      },
    },
  },
})
