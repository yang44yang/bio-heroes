// test-lobby-protocol.mjs —— PvP 大厅「卡组帧」encode/decode 守卫。
//
// 守两样：① 结构合法帧被接受 + round-trip 一致；② 畸形/越权/超大帧被拒
//   （→ host 的 guestDeckReady 保持 false，开战门控兜住，fail-safe）。
// ⚠️ 只 import src/net/lobbyProtocol.js（纯函数，零 ws/DOM）→ 进主 CI。

import { encodeDeckFrame, decodeDeckFrame, DECK_FRAME } from '../src/net/lobbyProtocol.js'
import { DECK_SIZE, SP_DECK_SIZE } from '../src/data/deckRules.js'

let pass = 0
const fails = []
const assert = (cond, msg) => { if (cond) pass++; else fails.push(msg) }

// ---- ① encode 形状 ----
{
  const f = encodeDeckFrame({ main: ['a', 'b'], sp: ['x'] })
  assert(f.t === DECK_FRAME && f.t === 'deck', '① encode t=deck')
  assert(Array.isArray(f.main) && f.main.length === 2, '① encode 带 main')
  const e = encodeDeckFrame({})
  assert(Array.isArray(e.main) && e.main.length === 0 && Array.isArray(e.sp), '① encode 缺字段兜成空数组')
}

// ---- ② 合法帧被接受 + round-trip ----
{
  const main = Array.from({ length: DECK_SIZE }, (_, i) => `card_${i}`)
  const sp = ['sp_a', 'sp_b']
  const d = decodeDeckFrame(encodeDeckFrame({ main, sp }))
  assert(d.ok, '② 合法帧被接受')
  assert(JSON.stringify(d.main) === JSON.stringify(main), '② round-trip main 一致')
  assert(JSON.stringify(d.sp) === JSON.stringify(sp), '② round-trip sp 一致')
  assert(decodeDeckFrame(encodeDeckFrame({ main, sp: [] })).ok, '② 空 SP 合法（玩家可无 SP）')
}

// ---- ③ 畸形/越权/超大被拒 ----
{
  assert(!decodeDeckFrame({ t: 'sync', main: ['a'], sp: [] }).ok, '③ 拒错 t（不是 deck）')
  assert(!decodeDeckFrame(null).ok, '③ 拒 null')
  assert(!decodeDeckFrame({ t: 'deck', main: 'notarray', sp: [] }).ok, '③ 拒 main 非数组')
  assert(!decodeDeckFrame({ t: 'deck', main: ['a'], sp: 'x' }).ok, '③ 拒 sp 非数组')
  assert(!decodeDeckFrame({ t: 'deck', main: ['a', 3, 'b'], sp: [] }).ok, '③ 拒 main 含非字符串')
  assert(!decodeDeckFrame({ t: 'deck', main: ['a', ''], sp: [] }).ok, '③ 拒空字符串 id')
  const huge = Array.from({ length: DECK_SIZE + 1 }, (_, i) => `c${i}`)
  assert(!decodeDeckFrame({ t: 'deck', main: huge, sp: [] }).ok, '③ 拒超 DECK_SIZE 的 main')
  const hugeSp = Array.from({ length: SP_DECK_SIZE + 1 }, (_, i) => `s${i}`)
  assert(!decodeDeckFrame({ t: 'deck', main: ['a'], sp: hugeSp }).ok, '③ 拒超 SP_DECK_SIZE 的 sp')
}

if (fails.length) {
  console.error(`❌ test-lobby-protocol: ${fails.length} 条失败`)
  for (const f of fails) console.error('   · ' + f)
  process.exit(1)
}
console.log(`✅ test-lobby-protocol: ${pass} 条断言通过`)
