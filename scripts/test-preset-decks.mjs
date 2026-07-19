// test-preset-decks.mjs —— 4 套 PvP 预设卡组合法性 + 可解析守卫。
//
// 守：每套 = DECK_SIZE 主卡、≤ SP_DECK_SIZE 的 SP、同名 ≤ MAX_SAME_CARD，且所有 ID 都能
//   resolveDeck 出来（否则开战时发短牌）。buildFactionDeck 若改坏、或卡库删了预设引用的卡 → 这里红。

import { PRESET_DECKS } from '../src/data/presetDecks.js'
import { resolveDeck } from '../src/data/deckResolve.js'
import { DECK_SIZE, SP_DECK_SIZE, MAX_SAME_CARD } from '../src/data/deckRules.js'

let pass = 0
const fails = []
const assert = (cond, msg) => { if (cond) pass++; else fails.push(msg) }

assert(PRESET_DECKS.length === 4, '有 4 套预设')
for (const d of PRESET_DECKS) {
  assert(d.main.length === DECK_SIZE, `${d.name} 主卡 = ${DECK_SIZE}（实 ${d.main.length}）`)
  assert(d.sp.length <= SP_DECK_SIZE, `${d.name} SP ≤ ${SP_DECK_SIZE}`)
  const counts = {}
  d.main.forEach((id) => { counts[id] = (counts[id] || 0) + 1 })
  assert(Math.max(...Object.values(counts)) <= MAX_SAME_CARD, `${d.name} 同名 ≤ ${MAX_SAME_CARD}`)
  const r = resolveDeck(d)
  assert(r.mainCards.length === DECK_SIZE, `${d.name} 主卡全部可解析（实 ${r.mainCards.length}）`)
  assert(r.spCards.length === d.sp.length, `${d.name} SP 全部可解析`)
  // 生物+事件混编：每套应含事件卡（A 的修复：找回玩法维度/知识点），且都是该阵营的
  const evts = r.mainCards.filter((c) => c.type === 'event')
  assert(evts.length >= 4, `${d.name} 含事件卡（实 ${evts.length}）`)
  assert(evts.every((c) => c.faction === d.faction), `${d.name} 事件卡都是本阵营`)
}

if (fails.length) {
  console.error(`❌ test-preset-decks: ${fails.length} 条失败`)
  for (const f of fails) console.error('   · ' + f)
  process.exit(1)
}
console.log(`✅ test-preset-decks: ${pass} 条断言通过`)
