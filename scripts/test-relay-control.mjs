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

// ---- ① host 首连（建房）握手 ----
{
  const h = parseHandshake('/api/relay?role=host')
  assert(h.ok && h.role === 'host', '① role=host 解析成功')
  // host **首连**不接受客户端指定房间码/token —— 码由中继铸（防客户端占码/碰撞攻击）。
  // 变异：把「host 无 token → 早返回」那条闸门删掉、让 host 一律去读 room → 本条红。
  assert(h.code === null && h.token === null, '① host 首连（无 token）的 code/token 为 null（中继才铸码）')

  // ☠️ 收紧语义：不只是「没给码」，而是「给了码也不认」—— 否则客户端就能自选房间码建房。
  const squat = parseHandshake('/api/relay?role=host&room=4BZU')
  assert(squat.ok && squat.code === null,
    '① ☠️ host 只带 room 不带 token → 仍按建房处理、room 被忽略（客户端不能占码）')
}

// ---- ⑥ ☠️ host 重连握手（真机 bug：host 闪断后重连新建房，对局静默永久卡死）----
//   真机实测：host 建房 4BZU → 掐断底层 socket → 重连拿到 QWJV（新房），
//   guest 从此一帧收不到、双方 UI 都显示 connected，还漏一个孤儿房。
//   根因就在这个函数：host 分支曾无条件 return { code:null, token:null }。
{
  const r = parseHandshake('/api/relay?role=host&room=4bzu&token=tok_host')
  // 变异：host 分支恢复成无条件 return {code:null,token:null} → 下面三条全红
  assert(r.ok && r.role === 'host', '⑥ host 重连解析成功')
  assert(r.code === '4BZU', '⑥ ☠️ host 重连的房间码被解析出来（且归一成大写）')
  assert(r.token === 'tok_host', '⑥ ☠️ host 重连的 token 被解析出来 —— 缺它就会被当成新 host 铸新房')

  // 有 token 就必须有合法码（token 是闸门，但闸门后仍要校验码）
  assert(parseHandshake('/api/relay?role=host&token=tok').reason === 'bad-room',
    '⑥ host 带 token 但无房间码 → bad-room')
  assert(parseHandshake('/api/relay?role=host&room=ABOD&token=tok').reason === 'bad-room',
    '⑥ host 重连的非法码（含 O）同样拒')

  // ☠️ 对称性：host 与 guest 的重连解析除 role 外必须逐字段一致 —— 这条钉死「凭证路径不再按 role 分叉」。
  //   变异：只给 guest 读 token / 只给 host 读 room → 本条红。
  const hr = parseHandshake('/api/relay?role=host&room=K7P2&token=tok_x')
  const gr = parseHandshake('/api/relay?role=guest&room=K7P2&token=tok_x')
  assert(hr.ok && gr.ok && hr.code === gr.code && hr.token === gr.token && hr.role !== gr.role,
    '⑥ ☠️ host/guest 两条重连路径除 role 外解析完全一致（凭证路径 role-blind）')
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

assert(pass > 27, `⑦ 断言真的跑了（实测 ${pass} 条）`)

if (fails.length) {
  console.error(`❌ test-relay-control: ${fails.length} 条失败`)
  for (const f of fails) console.error('   · ' + f)
  process.exit(1)
}
console.log(`✅ test-relay-control: ${pass} 条断言通过`)
