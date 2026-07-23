// Bio Heroes Service Worker — Cache-first for assets, network-first for navigation
//
// ⚠️ 改 fetch 规则（尤其是新增旁路）时**必须同时 bump CACHE_NAME**：
//    activate 只删 `k !== CACHE_NAME` 的键 —— 不换名字，已经被旧规则缓存进去的
//    条目一条都清不掉，新规则对它们无效。旁路和 bump 必须在同一个 commit 里。
// v1 → v2 (2026-07-17): 新增 /api/* 旁路，见下方 fetch handler。
// v2 → v3 (2026-07-23): 新增内容哈希资源的**同名旧版剪枝**（cachePut），治无界增长。
const CACHE_NAME = 'bio-heroes-v3'

// dev 兜底：若 SW 在本地 dev/preview 端口被激活（历史装过 PWA 的设备），
// 主动自杀 + 清缓存。否则 cache-first 会截住 vite 的 /@vite/client、/src/main.jsx
// 等带版本时间戳的资源 → 整个 React 不挂载 → 黑屏。
const IS_DEV_HOST =
  self.location.hostname === 'localhost' ||
  self.location.hostname === '127.0.0.1' ||
  self.location.hostname.endsWith('.local') ||
  self.location.port === '5173' || self.location.port === '4174'

if (IS_DEV_HOST) {
  self.addEventListener('install', (e) => { self.skipWaiting() })
  self.addEventListener('activate', (e) => {
    e.waitUntil((async () => {
      const keys = await caches.keys()
      await Promise.all(keys.map(k => caches.delete(k)))
      await self.registration.unregister()
      const clients = await self.clients.matchAll()
      clients.forEach(c => c.navigate(c.url))
    })())
  })
  // 不注册 fetch handler → 不接管请求，dev 资源直走网络。下面生产逻辑不要再加 listener。
} else {
  // —— 生产模式：cache-first 静态资源 / network-first HTML ——

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
]

// Install: precache shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// 把响应写进缓存，并**剪掉同名旧哈希版**。
//   内容哈希资源（vite 的 `index-<8位哈希>.js`）每次发版换新哈希堆进同一个 cache，旧的从不清
//   → 无界增长（齐齐的 iPad 会一直囤历史 bundle）。这里在写新版时顺手删掉 `<同名>-<别的哈希>.<同扩展>`。
//   ☠️ **全程 try/catch 吞掉、fire-and-forget**（调用方不 await、不进 respondWith 链）——
//      缓存/剪枝绝不能影响已经返回的响应。最坏是剪错 → 下次 cache miss 走网络，**不黑屏**。
async function cachePut(request, response) {
  try {
    const cache = await caches.open(CACHE_NAME)
    await cache.put(request, response)
    const path = new URL(request.url).pathname
    // 匹配 vite 的内容哈希命名：<base>-<8位哈希>.<ext>（哈希是 base64url 字符集）
    const m = path.match(/^(.*)-[A-Za-z0-9_-]{8}(\.[a-z0-9]+)$/)
    if (!m) return                              // 非哈希资源（manifest / icons / index.html）→ 不剪
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const sibling = new RegExp('^' + esc(m[1]) + '-[A-Za-z0-9_-]{8}' + esc(m[2]) + '$')
    for (const req of await cache.keys()) {
      const p = new URL(req.url).pathname
      if (p !== path && sibling.test(p)) await cache.delete(req)   // 同名旧哈希版 = 死的，删
    }
  } catch { /* 缓存/剪枝失败绝不影响响应 */ }
}

// Fetch: cache-first for static assets, network-first for HTML
self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)

  // Skip non-GET and cross-origin
  if (request.method !== 'GET' || url.origin !== location.origin) return

  // ★ /api/* 一律不接管 —— 动态数据永远不能进 CacheStorage。
  //
  //   为什么必须显式旁路：下面只有 navigate / text-html 走 network-first，**其余全部
  //   落进最后那段 cache-first**。而 /api/* 的 GET（Accept: */* 或 text/event-stream）
  //   两个条件都不匹配 → 默认就被 cache-first 截住，后果是静默且难查的：
  //     · 轮询：首个响应被缓存并永久重放 → 客户端冻在第一帧状态，看起来像「对手不动了」
  //     · SSE ：res.clone() 把一条无限流 tee 进 cache.put，那个 put 永远不 settle
  //             → 整局对战期间 buffer 一直涨
  //   （WebSocket 不受影响：WS 握手根本不触发 fetch 事件。PvP 走 WS 正是因为这个。
  //     但 P2 云存档会挂在同一个 Node 进程上走普通 HTTP —— 那时才发现就晚了，
  //     这两行是提前买的保险。）
  //
  //   `return` 而不 respondWith = 交还给浏览器按默认走网络，正是我们要的。
  if (url.pathname.startsWith('/api/')) return

  // HTML navigation → network-first
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(request)
        .then(res => {
          cachePut(request, res.clone())   // fire-and-forget（HTML 是 `/`，非哈希 → 不剪，只更新）
          return res
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // Static assets (JS/CSS/images) → cache-first
  e.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached
      return fetch(request).then(res => {
        if (res.ok) cachePut(request, res.clone())   // fire-and-forget：写缓存 + 剪同名旧哈希版
        return res
      })
    })
  )
})

} // end production branch
