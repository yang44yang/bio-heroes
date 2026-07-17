// test-api-proxy.mjs —— dev/preview 的 /api/* 代理配置守卫（PvP 前置）。
//
// 为什么有这个文件（2026-07-17）：
//   生产上 Caddy 把 /api/* 反代到 127.0.0.1:3002（DEPLOY.md §4.1）。本地没有 Caddy，
//   所以 vite 必须自己代理 —— 否则 /api/* 会被当成前端路由，PvP 在本地根本跑不起来，
//   而症状是**误导性的**：DEPLOY.md §4.4 记着，生产在加 handle 块之前
//   `GET /api/rooms` 返回的是 **index.html + HTTP 200**（不是 404、不是 502），
//   客户端只会在 .json() 那里报一个看不懂的解析错误。本地不配代理就是同一个坑。
//   MEMORY 里也记着这个项目「在 localhost 上不工作」的前科 —— 那次是 dev 配置，不是真 bug。
//
// ⚠️ **key 必须是正则 `^/api/`，不能是字符串 `/api`。**
//   vite 的字符串 key 是 startsWith 前缀匹配 → `/api` 会误伤 `/apidocs`、`/apiary`。
//   （实测过：加字符串 key 之后 `GET /apidocs` 也被代理走了。）
//   sw.js 的 /api/* 旁路有同款边界断言（test-sw-api-bypass 的「/apidocs 不是 /api/」），
//   两处必须保持一致的语义 —— 否则「本地能过、生产被 SW 截住」或反过来。
//
// ⚠️ **ws: true 不能省。** PvP 走 WebSocket，而选 WS 不是偏好：public/sw.js 会把非 navigate
//   的 GET 全部送进 cache-first 分支（轮询被永久重放 / SSE 把无限流 tee 进 cache.put），
//   WS 握手根本不触发 SW 的 fetch 事件。没有 ws:true，代理只转 HTTP、握手失败。
//
// 这是 source-grep 守卫（vite.config.js 是配置、不是可 import 的纯模块）—— 它只能证明
// 配置写对了，证明不了 vite 真的按它跑。真行为已在 preview(4174) 实测：
//   /api/rooms → 500(ECONNREFUSED，诚实失败) · /apidocs → 200(未被误伤) · / → 200

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * 剥注释再扫 —— 复用 test-no-side-fork.mjs 里那个**会跟踪字符串状态**的实现。
 *
 * ⚠️ 这一小段有两次血账，都是变异测试当场抓到的：
 *   ① 初版根本不剥 → `/ws:\s*true/` 匹配到了**注释里**那句「没有 ws:true，代理只转 HTTP」
 *      → 删掉真正的 `ws: true` 之后测试照样绿。
 *   ② 第二版用朴素的 `l.replace(/\/\/.*$/, '')` → 把 `'http://127.0.0.1:3002'` 里的 `//`
 *      当成行注释，URL 被截断成 `'http:` → ③ 无辜变红。
 *   battleReducer.js 的文件头也记着同一族的坑（test-field-slots 把注释里的示例当真代码）。
 *   **凡 source-grep 守卫：先剥注释、剥注释器要认字符串、且必须配变异测试。**
 */
function stripComments(src) {
  let out = ''
  let i = 0
  let mode = 'code' // code | line | block | sq | dq | tpl
  while (i < src.length) {
    const c = src[i], n = src[i + 1]
    if (mode === 'code') {
      if (c === '/' && n === '/') { mode = 'line'; i += 2; continue }
      if (c === '/' && n === '*') { mode = 'block'; i += 2; continue }
      if (c === "'") mode = 'sq'
      else if (c === '"') mode = 'dq'
      else if (c === '`') mode = 'tpl'
      out += c; i++; continue
    }
    if (mode === 'line') { if (c === '\n') { mode = 'code'; out += c }; i++; continue }
    if (mode === 'block') { if (c === '*' && n === '/') { mode = 'code'; i += 2 } else i++; continue }
    out += c
    if (c === '\\') { out += src[i + 1] ?? ''; i += 2; continue }
    if ((mode === 'sq' && c === "'") || (mode === 'dq' && c === '"') || (mode === 'tpl' && c === '`')) {
      if (out.length > 1) mode = 'code'
    }
    i++
  }
  return out
}

// 剥注释器的自检 —— 它坏掉时本文件必须响，而不是静默空转
{
  const t = stripComments(`const u = 'http://127.0.0.1:3002'  // 注释里的 ws: true 不算`)
  if (!t.includes('127.0.0.1:3002')) throw new Error('剥注释器把 URL 里的 // 当成注释了（第二版的 bug）')
  if (t.includes('注释里的')) throw new Error('剥注释器没剥掉行注释（初版的 bug）')
}

const src = stripComments(readFileSync(join(root, 'vite.config.js'), 'utf8'))

let pass = 0
const fails = []
const assert = (cond, msg) => { if (cond) pass++; else fails.push(msg) }

// ① 代理存在，且 dev 与 preview 都挂了
assert(/server:\s*\{\s*proxy:/.test(src), '① dev server 必须配 /api 代理')
assert(/preview:\s*\{\s*proxy:/.test(src),
  '① preview 也必须配 —— 本项目的验证铁律是走 `vite preview`(4174) 而非 dev server')

// ② key 是正则 ^/api/，不是字符串 /api
assert(/['"]\^\/api\/['"]\s*:/.test(src),
  "② 代理 key 必须是正则 '^/api/' —— 字符串 '/api' 是 startsWith 前缀匹配，会误伤 /apidocs")
assert(!/['"]\/api['"]\s*:\s*\{/.test(src),
  "② 不得使用字符串 key '/api'（前缀匹配会把 /apidocs、/apiary 一起代理走）")

// ③ 目标端口与 DEPLOY.md §4.1 一致
assert(/127\.0\.0\.1:3002/.test(src),
  '③ 代理目标必须是 127.0.0.1:3002 —— 与 DEPLOY.md §4.1 的 Caddy 反代目标一致，否则本地与生产不是同一条路')

// ④ ws: true
assert(/ws:\s*true/.test(src),
  '④ 必须 ws: true —— PvP 走 WebSocket（sw.js 会吃掉轮询/SSE），没有它握手转不过去')

// ⑤ 与 sw.js 的旁路边界语义一致（两处都必须是「/api/ 带斜杠」而非「/api 前缀」）
{
  const sw = stripComments(readFileSync(join(root, 'public/sw.js'), 'utf8'))
  assert(/startsWith\(['"]\/api\/['"]\)/.test(sw),
    "⑤ sw.js 的旁路必须是 startsWith('/api/')（带尾斜杠）—— 与 vite 代理的 ^/api/ 同语义")
}

if (fails.length) {
  console.error(`❌ test-api-proxy: ${fails.length} 条失败`)
  for (const f of fails) console.error('   · ' + f)
  process.exit(1)
}
console.log(`✅ test-api-proxy: ${pass} 条断言通过`)
