#!/usr/bin/env node
// 「一键推荐」卡组守卫（2026-08-22）
//
// 背景：这是**新玩家做的第一件事** —— 点「⚔️ 自由对战」→ 空卡组 →「➕ 新建」→「推荐」→「⚔️ 出战」。
//   而它此前埋在 DeckBuilder.jsx 里、一行测试都没有。全新存档实测复现：
//   点「🧬⚗️ 推荐」得到的 25 张里 **皮肤·第一道防线 ×5**，而游戏自己的规则是同名最多 3 张
//   （MAX_SAME_CARD）；保存后卡组列表照样给出「⚔️ 出战」，可以直接带这副非法卡组开打。
//
// ☠️ 根因值得记住：候选 `candidates` 在内层循环**外面**只算一次，那句「同名 < 3」用的是
//    **空卡组的陈旧快照**。某个费用段只有一张候选时（新玩家 body+tech 的 cost 3 正是如此），
//    `i % 1` 一直取同一张 → 目标要几张就塞几张。手动点卡不会中招（canAdd 用实时计数），
//    **只有推荐这条路会** —— 所以 grep 抓不住，必须真跑函数。
//
// 判据不是「跑得通」，而是**任何拥有量、任何阵营组合下都不许违反规则**：
//   凑不满 25 是可以接受的（卡不够就是不够），**凑出非法卡组不行**。

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import cards from '../src/data/cards.js'
import eventCards from '../src/data/eventCards.js'
import spCards from '../src/data/spCards.js'
import { DECK_SIZE, SP_DECK_SIZE, MAX_SAME_CARD, MAX_SAME_SP } from '../src/data/deckRules.js'
import { STARTER_COLLECTION, STARTER_EVENT_CARDS } from '../src/data/starterPack.js'
import { generateRecommendedDeck } from '../src/utils/recommendDeck.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }
const read = (p) => readFileSync(join(ROOT, p), 'utf8')

// 复刻 DeckBuilder 的卡池口径（selectableMainPool = 生物卡 + 事件卡，再按 collection 过滤）
const selectableMainPool = [...cards.filter(c => c.type === 'character'), ...eventCards]
const ownedFrom = (ids) => {
  const owned = new Set(ids)
  return {
    main: selectableMainPool.filter(c => owned.has(c.id)),
    sp: spCards.filter(c => owned.has(c.id)),
  }
}
const counts = (arr) => arr.reduce((m, id) => (m[id] = (m[id] || 0) + 1, m), {})
const overLimit = (ids, max) => Object.entries(counts(ids)).filter(([, n]) => n > max)

const FACTIONS = ['nature', 'body', 'pathogen', 'tech']
// 组件里真正挂在按钮上的两套组合
const UI_COMBOS = [['body', 'tech'], ['nature', 'pathogen']]

// ============ ① 新玩家（真实初始礼包）：两个「推荐」按钮都必须给出合法卡组 ============
const starter = ownedFrom([...STARTER_COLLECTION, ...STARTER_EVENT_CARDS])
for (const [a, b] of UI_COMBOS) {
  const rec = generateRecommendedDeck(a, b, starter.main, starter.sp)
  const over = overLimit(rec.main, MAX_SAME_CARD)
  ok(`① ★ 新玩家点「${a}+${b} 推荐」不得产出同名超过 ${MAX_SAME_CARD} 张的非法卡组`
    + (over.length ? ` —— 实际 ${over.map(([id, n]) => `${id}×${n}`).join(', ')}` : ''),
    over.length === 0)
  ok(`① ★ 新玩家点「${a}+${b} 推荐」要凑满 ${DECK_SIZE} 张（凑不满就点不了「出战」，等于按钮白给）`
    + ` —— 实际 ${rec.main.length}`,
    rec.main.length === DECK_SIZE)
}

// ============ ② 对抗式：任意阵营组合 × 任意拥有量，都不许违规 ============
// 凑不满可以（卡不够就是不够），**非法不行**。极端拥有量正是触发陈旧快照的地方。
for (const a of FACTIONS) {
  for (const b of FACTIONS) {
    if (a === b) continue
    const all = { main: selectableMainPool, sp: spCards }
    const rec = generateRecommendedDeck(a, b, all.main, all.sp)
    ok(`② 全卡池 ${a}+${b}：主卡组同名不超 ${MAX_SAME_CARD}`, overLimit(rec.main, MAX_SAME_CARD).length === 0)
  }
}
// 极端：该阵营只拥有 1 / 2 张卡 —— 目标份数远大于候选数，最容易把同一张塞爆
for (const n of [1, 2, 3]) {
  const pool = selectableMainPool.filter(c => c.faction === 'body').slice(0, n)
  const rec = generateRecommendedDeck('body', 'body', pool, [])
  const over = overLimit(rec.main, MAX_SAME_CARD)
  ok(`② ★ 只拥有 ${n} 张该阵营卡时仍不许违规（凑不满没关系，非法不行）`
    + (over.length ? ` —— 实际 ${over.map(([id, m]) => `${id}×${m}`).join(', ')}` : ''),
    over.length === 0)
  ok(`② 只拥有 ${n} 张时，产出上限 = ${n}×${MAX_SAME_CARD}（不得凭空多出牌）`,
    rec.main.length <= n * MAX_SAME_CARD)
}
ok('② 空卡池不崩、返回空卡组', (() => {
  const rec = generateRecommendedDeck('body', 'tech', [], [])
  return Array.isArray(rec.main) && rec.main.length === 0
})())

// ============ ③ SP 卡组同样受规则约束 ============
for (const [a, b] of UI_COMBOS) {
  const rec = generateRecommendedDeck(a, b, selectableMainPool, spCards)
  ok(`③ ${a}+${b}：SP 卡组不超 ${SP_DECK_SIZE} 张`, rec.sp.length <= SP_DECK_SIZE)
  ok(`③ ${a}+${b}：SP 同名不超 ${MAX_SAME_SP}`, overLimit(rec.sp, MAX_SAME_SP).length === 0)
}

// ============ ④ 产出的 id 必须真的在玩家拥有的池子里 ============
// 「推荐」给一张玩家没有的卡 = 卡组里出现幽灵卡，战斗时才炸。
{
  const ownedIds = new Set(starter.main.map(c => c.id))
  const rec = generateRecommendedDeck('body', 'tech', starter.main, starter.sp)
  ok('④ ★ 推荐产出的每张卡都在玩家拥有的池子里（不得凭空发牌）',
    rec.main.every(id => ownedIds.has(id)))
}

// ============ ⑤ grep 锚点：组件必须用这个纯核心，不许再内联一份 ============
const db = read('src/components/DeckBuilder.jsx')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"'`\\])\/\/[^\n]*/gm, '$1')
ok('⑤ ★ DeckBuilder 从 utils/recommendDeck 引入（内联一份 = 本守卫测的就不是线上那份了）',
  /from\s+'\.\.\/utils\/recommendDeck(\.js)?'/.test(db))
ok('⑤ ★ DeckBuilder 里不得再有本地的 generateRecommendedDeck 定义',
  !/function\s+generateRecommendedDeck/.test(db))

// ============ ⑥ 初始礼包的数量注释必须和真实条目对账 ============
// 原注释写「25张」、分组写 7/7/5/5，实际 5/5/4/4 + 2 事件卡 = 20。
// 过期注释会让下一个动数值的人算错预算（教学关卡就栽过一次：注释写「2费」实际 4 费）。
{
  const src = read('src/data/starterPack.js')
  const declared = [...src.matchAll(/\/\/\s*[🌱🧬🦠⚗️]?[^\n]*?(\d+)\s*张/g)].map(m => +m[1])
  const byFaction = {}
  for (const c of selectableMainPool.filter(c => STARTER_COLLECTION.includes(c.id))) {
    byFaction[c.faction] = (byFaction[c.faction] || 0) + 1
  }
  ok(`⑥ ★ 注释里的分组张数与真实条目一致（注释 [${declared}] vs 生物卡按阵营 `
    + `[${FACTIONS.map(f => byFaction[f] || 0)}] + 事件卡 ${STARTER_EVENT_CARDS.length}）`,
    declared.includes(STARTER_COLLECTION.length)
    && FACTIONS.every(f => declared.includes(byFaction[f] || 0))
    && declared.includes(STARTER_EVENT_CARDS.length))
  ok('⑥ 初始礼包里的 id 都是真卡（写错 id 就是玩家少一张卡，且静默）',
    [...STARTER_COLLECTION, ...STARTER_EVENT_CARDS]
      .every(id => selectableMainPool.some(c => c.id === id) || spCards.some(c => c.id === id)))
}

console.log(`\n${fail === 0 ? '✅' : '⚠️'} test-deck-recommend: 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
