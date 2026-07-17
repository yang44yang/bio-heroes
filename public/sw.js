// Bio Heroes Service Worker — Cache-first for assets, network-first for navigation
//
// ⚠️ 改 fetch 规则（尤其是新增旁路）时**必须同时 bump CACHE_NAME**：
//    activate 只删 `k !== CACHE_NAME` 的键 —— 不换名字，已经被旧规则缓存进去的
//    条目一条都清不掉，新规则对它们无效。旁路和 bump 必须在同一个 commit 里。
// v1 → v2 (2026-07-17): 新增 /api/* 旁路，见下方 fetch handler。
const CACHE_NAME = 'bio-heroes-v2'

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
          const clone = res.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
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
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
        }
        return res
      })
    })
  )
})

} // end production branch
