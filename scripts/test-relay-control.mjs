// test-relay-control.mjs —— 握手解析守卫（PvP 第 3 步）。
//
// 守两样：① 握手信息全来自 URL query，中继零消息体解析；
//         ② ☠️ 绝不读 seat query（客户端不能自选座位，同 wire.js:706 的纪律）。
//
// ⚠️ 只 import relay/lib/*.js（零 ws）→ 进主 CI。

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { parseHandshake } from '../relay/lib/control.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0
const fails = []
const assert = (cond, msg) => { if (cond) pass++; else fails.push(msg) }

// ---- ① host 握手 ----
{
  const h = parseHandshake('/api/relay?role=host')
  assert(h.ok && h.role === 'host', '① role=host 解析成功')
  // host 不接受客户端指定房间码/token —— 码由中继铸（防客户端占码/碰撞攻击）
  assert(h.code === null && h.token === null, '① host 的 code/token 为 null（中继才铸码）')
}

// ---- ② guest 握手 ----
{
  const g = parseHandshake('/api/relay?role=guest&room=ab2d')
  assert(g.ok && g.role === 'guest', '② role=guest 解析成功')
  // 变异：删归一化 → 本条红（孩子念出的码大小写随意）
  assert(g.code === 'AB2D', '② 房间码归一成大写')
  assert(g.token === null, '② 首次加入 token 为 null')

  const rc = parseHandshake('/api/relay?role=guest&room=AB2D&token=xyz123')
  assert(rc.ok && rc.token === 'xyz123', '② 重连带 token')

  // guest 缺房间码 / 非法码 → 拒
  assert(parseHandshake('/api/relay?role=guest').reason === 'bad-room', '② guest 缺 room → bad-room')
  assert(parseHandshake('/api/relay?role=guest&room=AB').reason === 'bad-room', '② guest 短码 → bad-room')
  assert(parseHandshake('/api/relay?role=guest&room=ABOD').reason === 'bad-room', '② guest 含 O 的码 → bad-room')
}

// ---- ③ 缺 / 非法 role ----
{
  assert(parseHandshake('/api/relay').reason === 'bad-role', '③ 缺 role → bad-role')
  assert(parseHandshake('/api/relay?role=spectator').reason === 'bad-role', '③ 非法 role → bad-role')
  assert(parseHandshake('/api/relay?role=admin&room=AB2D').reason === 'bad-role', '③ 伪造 role 拒')
}

// ---- ④ ☠️ 绝不读 seat query（source-grep + 行为双守卫）----
{
  // 行为：即便客户端塞了 seat=player，parseHandshake 的产物里也不得出现它。
  // 变异：parseHandshake 读 url.searchParams.get('seat') 并塞进返回 → 本条红。
  const evil = parseHandshake('/api/relay?role=guest&room=AB2D&seat=player')
  assert(evil.ok && !('seat' in evil),
    '④ ☠️ 握手产物不得含 seat —— 客户端不能自选座位（座位由 host adapter 从角色推导，同 wire.js:706）')
  assert(!JSON.stringify(evil).includes('player'),
    '④ ☠️ 客户端塞的 seat=player 不得泄进握手结果')

  // source-grep：control.js 全文不得出现读 seat 的代码
  const src = stripComments(readFileSync(join(root, 'relay/lib/control.js'), 'utf8'))
  assert(!/searchParams\s*\.\s*get\s*\(\s*['"`]seat['"`]/.test(src),
    '④ ☠️ control.js 源码不得 searchParams.get("seat")')
  assert(!/\bseat\b/.test(src),
    '④ ☠️ control.js 源码里根本不该出现 seat 这个词（座位不是中继的词汇）')
}

// ---- ⑤ 垃圾输入不崩 ----
{
  assert(parseHandshake('').reason !== undefined, '⑤ 空字符串不崩（返回 reason）')
  assert(parseHandshake('%%%').ok === false, '⑤ 非法 URL 转义不崩')
  assert(typeof parseHandshake('/api/relay?role=host').ok === 'boolean', '⑤ 恒返回带 ok 的对象')
}

// ---- 自检：stripComments ----
function stripComments(srcTxt) {
  let out = ''
  let i = 0
  let mode = 'code'
  while (i < srcTxt.length) {
    const c = srcTxt[i], n = srcTxt[i + 1]
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
    if (c === '\\') { out += srcTxt[i + 1] ?? ''; i += 2; continue }
    if ((mode === 'sq' && c === "'") || (mode === 'dq' && c === '"') || (mode === 'tpl' && c === '`')) {
      if (out.length > 1) mode = 'code'
    }
    i++
  }
  return out
}
// ⓪ 剥注释器自检：④ 的 source-grep 依赖它正确（control.js 的注释里**故意**多处写了 seat，
//    必须被剥掉，否则 ④ 的 grep 会被注释里的 seat 误伤成红 —— 那正是「注释污染扫描」的坑）
assert(!stripComments('// seat here\n').includes('seat'), '⓪ 行注释里的 seat 被剥掉')
assert(stripComments('const s = "seat"\n').includes('seat'), '⓪ 代码里的 seat 字符串被保留')

assert(pass > 18, `⑥ 断言真的跑了（实测 ${pass} 条）`)

if (fails.length) {
  console.error(`❌ test-relay-control: ${fails.length} 条失败`)
  for (const f of fails) console.error('   · ' + f)
  process.exit(1)
}
console.log(`✅ test-relay-control: ${pass} 条断言通过`)
