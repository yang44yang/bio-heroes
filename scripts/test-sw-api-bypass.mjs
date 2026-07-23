// test-sw-api-bypass.mjs — Service Worker 绝不能接管 /api/* 的漂移守卫。
//
// 为什么有这个文件（2026-07-17，PvP 前置）：
//   public/sw.js 的 fetch handler 只对 navigate / text-html 走 network-first，
//   **其余请求全部落进最后那段 cache-first**。于是任何 /api/* 的 GET
//   （Accept: */* 或 text/event-stream，两个条件都不匹配）默认就被缓存截住：
//     · 轮询 → 首个响应被缓存并永久重放，客户端冻在第一帧，看起来像「对手不动了」
//     · SSE  → res.clone() 把无限流 tee 进 cache.put，那个 put 永不 settle，buffer 一直涨
//   两种都静默、都难查。PvP 走 WebSocket 是免疫的（WS 握手不触发 fetch 事件），
//   但 P2 云存档会挂在同一个 Node 进程上走普通 HTTP —— 旁路是提前买的保险。
//
//   配套铁律：**改 fetch 规则必须同时 bump CACHE_NAME**。activate 只删
//   `k !== CACHE_NAME` 的键，不换名字就清不掉已按旧规则缓存的条目。③ 守这条。
//
// 覆盖策略：**真的把 sw.js 跑起来**，不做源码正则匹配。
//   用 new Function 注入 mock 的 self / location / caches / fetch，捞出它注册的
//   fetch handler，喂构造的 request 进去，断言 respondWith 到底有没有被调用。
//   （sw.js 是浏览器脚本、无法 import；但它只依赖这几个全局，注入即可真跑。）

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = readFileSync(join(root, 'public/sw.js'), 'utf8')

let pass = 0
const fails = []
const assert = (cond, msg) => { if (cond) pass++; else fails.push(msg) }

/**
 * 在注入的假环境里跑 sw.js，返回它注册的各个 listener。
 * @param {string} hostname - 用于走 IS_DEV_HOST 的两个分支
 */
function loadSw(hostname = 'bio.socialcontract.capital', port = '') {
  const listeners = {}
  const self = {
    // ⚠️ origin 必须给 —— sw.js:58 用 `url.origin !== location.origin` 判跨源。
    //    漏了它 → origin 恒为 undefined → 每个请求都被当跨源跳过 → 「SW 没接管
    //    /api/*」这类断言全部因为错误的原因通过（本文件初版就踩了这个假绿，
    //    是 ② 的反向断言把它抓出来的 —— 这就是 ② 存在的意义）。
    location: { hostname, port, origin: port ? `http://${hostname}:${port}` : `https://${hostname}` },
    addEventListener: (type, fn) => { listeners[type] = fn },
    skipWaiting: () => {},
    clients: { claim: () => {}, matchAll: async () => [] },
    registration: { unregister: async () => {} },
  }
  const caches = {
    open: async () => ({ put: async () => {}, addAll: async () => {} }),
    match: async () => undefined,
    keys: async () => [],
    delete: async () => true,
  }
  const location = self.location
  const fetchStub = async () => ({ ok: true, clone: () => ({}) })
  // sw.js 引用的全局就这几个 —— 注入后即可原样求值
  // eslint-disable-next-line no-new-func
  new Function('self', 'location', 'caches', 'fetch', src)(self, location, caches, fetchStub)
  return listeners
}

/** 构造一个够用的 Request 替身 + 捕获 respondWith 的 event */
function mkEvent(url, { method = 'GET', accept = '*/*', mode = 'no-cors' } = {}) {
  let respondedWith = null
  return {
    request: {
      url, method, mode,
      headers: { get: (h) => (h.toLowerCase() === 'accept' ? accept : null) },
    },
    respondWith: (p) => { respondedWith = p },
    get taken() { return respondedWith !== null },
  }
}

const ORIGIN = 'https://bio.socialcontract.capital'

// ---- ① 生产模式下，/api/* 一律不接管 ----
{
  const sw = loadSw()
  assert(typeof sw.fetch === 'function', '① 生产模式必须注册 fetch handler')

  const apiCases = [
    ['/api/rooms', '*/*', 'GET 轮询（Accept: */*）'],
    ['/api/rooms/ABCD/state', '*/*', '房间状态轮询'],
    ['/api/stream', 'text/event-stream', 'SSE 流'],
    ['/api/saves/xyz', 'application/json', 'P2 云存档 GET'],
    ['/api/', '*/*', '裸 /api/ 前缀'],
  ]
  for (const [path, accept, label] of apiCases) {
    const e = mkEvent(ORIGIN + path, { accept })
    sw.fetch(e)
    assert(!e.taken, `① SW 不得接管 ${label} → ${path}（被接管 = 落进 cache-first）`)
  }
}

// ---- ② 反向回归：别把旁路写成「什么都不接管」----
// 静态资源仍必须走 cache-first，HTML 仍必须走 network-first —— 否则 PWA 离线就废了。
{
  const sw = loadSw()

  const asset = mkEvent(ORIGIN + '/assets/index-abc123.js')
  sw.fetch(asset)
  assert(asset.taken, '② 静态资源必须仍被接管（cache-first）—— 否则 PWA 离线能力没了')

  const html = mkEvent(ORIGIN + '/', { accept: 'text/html', mode: 'navigate' })
  sw.fetch(html)
  assert(html.taken, '② HTML 导航必须仍被接管（network-first）')

  // 非 GET / 跨源 本来就跳过（既有行为，防旁路把它写反）
  const post = mkEvent(ORIGIN + '/assets/x.js', { method: 'POST' })
  sw.fetch(post)
  assert(!post.taken, '② 非 GET 仍不接管')

  const cross = mkEvent('https://example.com/x.js')
  sw.fetch(cross)
  assert(!cross.taken, '② 跨源仍不接管')

  // 陷阱：/api 不该误伤同前缀的正常路径（如果将来有 /apidocs 之类）
  const lookalike = mkEvent(ORIGIN + '/apidocs/index.js')
  sw.fetch(lookalike)
  assert(lookalike.taken, '② /apidocs 不是 /api/ —— 不得被旁路误伤')
}

// ---- ③ 改了 fetch 规则就必须 bump CACHE_NAME ----
// activate 只删 `k !== CACHE_NAME` 的键：不换名字 → 已按旧规则缓存的条目一条都清不掉。
// 所以「加了 /api/ 旁路」和「CACHE_NAME 还是 v1」这个组合是**无效发布**，必须咬死。
{
  const m = src.match(/const CACHE_NAME = '([^']+)'/)
  assert(!!m, '③ 必须能读到 CACHE_NAME')
  assert(m && m[1] !== 'bio-heroes-v1',
    `③ CACHE_NAME 仍是 v1 —— 但 fetch 规则已经改了。不 bump 则旧缓存永不失效，` +
    `旁路对已投毒的条目无效（activate 只删 k !== CACHE_NAME）。实得 ${m && m[1]}`)
}

// ---- ④ dev 模式仍必须自杀、且不注册 fetch ----
// 既有行为（注释在 sw.js:4-11）：历史装过 PWA 的设备在 localhost/4174 上会被
// cache-first 截住 vite 的 /@vite/client → 黑屏。别让旁路把这个分支改坏。
{
  for (const [host, port] of [['localhost', '5173'], ['127.0.0.1', '4174'], ['foo.local', '']]) {
    const sw = loadSw(host, port)
    assert(typeof sw.fetch !== 'function',
      `④ dev 主机 ${host}:${port} 不得注册 fetch handler（会截住 vite 资源 → 黑屏）`)
    assert(typeof sw.activate === 'function', `④ dev 主机 ${host} 必须注册 activate（自杀+清缓存）`)
  }
}

// ---- ⑤ ☠️ cachePut 剪枝：写新哈希版时删同名旧哈希版（治无界增长）----
//   用 Map 支撑的真 caches mock 跑 fetch handler 的 cache-first 分支，观察缓存内容。
{
  // 一个够真的 Cache：keys() 返回 {url}，put/delete/match 走 Map
  function makeCacheStore(initial = []) {
    const store = new Map(initial.map((u) => [u, { url: u }]))
    return {
      store,
      async put(req) { store.set(req.url, { url: req.url }) },
      async delete(req) { return store.delete(req.url) },
      async keys() { return [...store.values()] },
      async match(req) { return store.get(req.url) },
      async addAll(urls) { urls.forEach((u) => store.set(u, { url: u })) },
    }
  }

  // 预置：旧哈希版 index/BattleScreen + 两个不该被误删的（非哈希 manifest、异名 chunk）
  const ORIG = 'https://bio.socialcontract.capital'
  const cache = makeCacheStore([
    ORIG + '/assets/index-OLDOLD11.js',
    ORIG + '/assets/BattleScreen-OLDOLD22.js',
    ORIG + '/assets/react-vendor-KEEPKEE1.js',   // 异名 chunk，绝不能被 index 的剪枝误删
    ORIG + '/manifest.json',                      // 非哈希，绝不能被剪
  ])

  // 装一套走这个 cache 的 sw
  const listeners = {}
  const self = {
    location: { hostname: 'bio.socialcontract.capital', port: '', origin: ORIG },
    addEventListener: (t, fn) => { listeners[t] = fn },
    skipWaiting: () => {}, clients: { claim: () => {}, matchAll: async () => [] },
    registration: { unregister: async () => {} },
  }
  const cachesMock = { open: async () => cache, match: async () => undefined, keys: async () => [], delete: async () => true }
  const fetchStub = async () => ({ ok: true, clone: () => ({}) })
  // eslint-disable-next-line no-new-func
  new Function('self', 'location', 'caches', 'fetch', src)(self, self.location, cachesMock, fetchStub)

  // 请求新哈希版 index → cache-first miss → fetch → cachePut 写入 + 剪同名旧版
  const e = mkEvent(ORIG + '/assets/index-NEWNEW99.js')
  listeners.fetch(e)
  await e.taken   // respondWith 的 promise（cache-first 链）
  // cachePut 是 fire-and-forget，给微任务队列一点时间跑完
  await new Promise((r) => setTimeout(r, 0))

  const paths = [...cache.store.keys()].map((u) => new URL(u).pathname).sort()
  // 变异：cachePut 删掉剪枝那段（只 put 不 delete）→ 下面「旧版已删」红
  assert(!paths.includes('/assets/index-OLDOLD11.js'), '⑤ ☠️ 写新哈希版后，同名旧哈希版被删（无界增长被收成有界）')
  assert(paths.includes('/assets/index-NEWNEW99.js'), '⑤ 新哈希版已写入缓存')
  // 变异：剪枝的 sibling 正则写太宽（跨 base 误删）→ 下面两条红
  assert(paths.includes('/assets/react-vendor-KEEPKEE1.js'), '⑤ ☠️ 异名 chunk 不被误删（react-vendor ≠ index）')
  assert(paths.includes('/assets/BattleScreen-OLDOLD22.js'), '⑤ 别的 base 的旧版也不被这次 index 剪枝波及')
  assert(paths.includes('/manifest.json'), '⑤ ☠️ 非哈希资源（manifest）永不被剪')
}

// ---- 汇总 ----
if (fails.length) {
  console.error(`❌ test-sw-api-bypass: ${fails.length} 条失败`)
  for (const f of fails) console.error('   · ' + f)
  process.exit(1)
}
console.log(`✅ test-sw-api-bypass: ${pass} 条断言通过`)
