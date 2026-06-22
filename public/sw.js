// Bio Heroes Service Worker — Cache-first for assets, network-first for navigation
const CACHE_NAME = 'bio-heroes-v1'

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
