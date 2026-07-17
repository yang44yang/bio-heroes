import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// PvP 中继在生产上由 Caddy 反代到 127.0.0.1:3002（见 DEPLOY.md §4.1）。
// 本地没有 Caddy → dev/preview 必须自己代理，否则 /api/* 会被当成前端路由 404，
// 而那会重演「在 localhost 上不工作」的老戏码（那次是 dev 配置问题，不是真 bug）。
//
// ⚠️ `ws: true` 不能省：PvP 走 WebSocket（选 WS 不是偏好 —— public/sw.js 会把非 navigate
//    的 GET 全部送进 cache-first 分支，轮询会被永久重放、SSE 会把无限流 tee 进 cache.put；
//    WS 握手根本不触发 SW 的 fetch 事件）。没有 ws:true，代理只转 HTTP，握手会失败。
//
// 中继没起时表现为 ECONNREFUSED（500）—— 那是**诚实的失败**，比 404 好：
// 404 会让人以为「端点不存在/路径写错了」，而真相是「服务没起」。
// ⚠️ key 用**正则** `^/api/` 而非字符串 `/api` —— vite 的字符串 key 是 startsWith 前缀匹配，
//    `/api` 会误伤 `/apidocs`、`/apiary` 这类同前缀路径（实测：加了字符串 key 之后
//    `GET /apidocs` 也被代理走了）。sw.js 的 /api/* 旁路有同款断言
//    （scripts/test-sw-api-bypass.mjs 的「/apidocs 不是 /api/ —— 不得被旁路误伤」），
//    这里保持一致的边界语义。
const API_PROXY = {
  '^/api/': {
    target: 'http://127.0.0.1:3002',
    changeOrigin: true,
    ws: true,
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: API_PROXY },
  // ⚠️ preview 也要 —— 本项目的验证铁律是走 `vite preview`(4174) 而非 dev server
  //    （沙箱里 dev 的 HMR 对懒加载块不可靠，见 SESSION 的「浏览器验证铁律」）。
  preview: { proxy: API_PROXY },
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
