#!/usr/bin/env node
// 「卡组体检 + 一键修正」守卫（2026-08-22）
//
// 背景：一键「推荐」曾产出**同名 5 张**的非法卡组（上限 3），生成器已修
// （utils/recommendDeck.js），但**已经存进 localStorage 的卡组不会自己变好** ——
// 齐齐存档里那副牌还违规着，而界面上看不出来。所以要能「标出来 + 一键修正」。
//
// ☠️ 修正最容易做错的地方：只削不补。削完 25 → 23 张，而「⚔️ 出战」要求正好 25 张，
//    孩子会发现"我的卡组突然不能出战了" —— 比原来更糟。② 段专门钉死这一条。

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import cards from '../src/data/cards.js'
import eventCards from '../src/data/eventCards.js'
import { DECK_SIZE, MAX_SAME_CARD, MAX_SAME_SP } from '../src/data/deckRules.js'
import { STARTER_COLLECTION, STARTER_EVENT_CARDS } from '../src/data/starterPack.js'
import { findDeckIssues, repairDeck, findUnhealthySlots } from '../src/utils/deckHealth.js'
import { generateRecommendedDeck } from '../src/utils/recommendDeck.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }
const read = (p) => readFileSync(join(ROOT, p), 'utf8')
const code = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"'`\\])\/\/[^\n]*/gm, '$1')

const selectableMainPool = [...cards.filter(c => c.type === 'character'), ...eventCards]
const starterIds = [...STARTER_COLLECTION, ...STARTER_EVENT_CARDS]
const ownedMain = selectableMainPool.filter(c => starterIds.includes(c.id))
const ownedIds = ownedMain.map(c => c.id)
const countBy = (ids) => ids.reduce((m, id) => (m[id] = (m[id] || 0) + 1, m), {})
const overOf = (ids, max) => Object.entries(countBy(ids)).filter(([, n]) => n > max)

// 这就是旧 bug 产出的形状：某张卡 5 份，其余合法，总数正好 25。
const brokenSlot = {
  name: '推荐组的',
  main: [
    ...Array(5).fill('skin_barrier'),
    ...Array(3).fill('platelet_guardian'),
    ...Array(3).fill('red_blood_cell'),
    ...Array(3).fill('bandaid_helper'),
    ...Array(3).fill('thermometer_alarm'),
    ...Array(3).fill('white_blood_cell'),
    ...Array(3).fill('stomach_acid'),
    ...Array(2).fill('microscope_eye'),
  ],
  sp: [],
}
const healthySlot = { name: '好的', main: repairDeck(brokenSlot, ownedIds).main, sp: [] }

// ============ ① 体检：认得出病，也别误报 ============
{
  const issues = findDeckIssues(brokenSlot)
  ok('① ★ 超限卡组被认出来', !!issues)
  ok('① ★ 指名道姓是哪张、几份（界面要靠它显示）',
    issues?.overMain?.some(o => o.id === 'skin_barrier' && o.count === 5 && o.max === MAX_SAME_CARD))
  ok('① ★ 报出一共多出几张（5 - 3 = 2）', issues?.extra === 2)
  ok('① ★ 合法卡组不得误报（误报比漏报更烦人 —— 界面会一直挂着修不掉的红字）',
    findDeckIssues(healthySlot) === null)
  ok('① 空槽位返回 null，不崩', findDeckIssues(null) === null && findDeckIssues(undefined) === null)
  ok('① SP 超限同样认得出',
    !!findDeckIssues({ main: [], sp: Array(MAX_SAME_SP + 1).fill('sp_x') }))
  ok('① 多槽位体检返回下标', JSON.stringify(findUnhealthySlots([healthySlot, null, brokenSlot])) === '[2]')
}

// ============ ② 修正：修完必须既合法、又还能出战 ============
{
  const fixed = repairDeck(brokenSlot, ownedIds)
  ok('② ★ 修完不再超限', findDeckIssues(fixed) === null)
  ok(`② ★ 修完仍是 ${DECK_SIZE} 张 —— 只削不补会让「⚔️ 出战」灰掉，比不修更糟（实际 ${fixed.main.length}）`,
    fixed.main.length === DECK_SIZE)
  ok('② ★ 修完的卡都在玩家拥有的池子里（不得补出他没有的卡）',
    fixed.main.every(id => ownedIds.includes(id)))
  ok('② ★ 幂等：修两次和修一次结果一样（否则每次打开界面都在改存档）',
    JSON.stringify(repairDeck(fixed, ownedIds)) === JSON.stringify(fixed))
  ok('② ★ 本来就合法的卡组不得被改动（一键修正不许顺手"优化"玩家的牌）',
    JSON.stringify(repairDeck(healthySlot, ownedIds)) === JSON.stringify(healthySlot))
  ok('② 卡组名字等其它字段要保留', fixed.name === brokenSlot.name)
  ok('② 削的是超出的那几份，不是整张卡删光（皮肤仍在，只是从 5 变 3）',
    fixed.main.filter(id => id === 'skin_barrier').length === MAX_SAME_CARD)
}

// ============ ③ 对抗式：随便怎么坏，修完都得合法 ============
{
  // 用固定序列造一堆畸形卡组（不用随机 —— 守卫必须可复现）
  let bad = 0
  for (let k = 1; k <= 12; k++) {
    const main = []
    for (let i = 0; i < 40; i++) main.push(ownedIds[(i * k) % Math.min(k, ownedIds.length)])
    const fixed = repairDeck({ main, sp: [] }, ownedIds)
    if (findDeckIssues(fixed) !== null) bad++
    if (fixed.main.length > DECK_SIZE) bad++
    if (!fixed.main.every(id => ownedIds.includes(id))) bad++
  }
  ok(`③ ★ 12 组畸形卡组修完全部合法、不超 ${DECK_SIZE} 张、无幽灵卡（坏例 ${bad}）`, bad === 0)

  // 池子太小：补不满是允许的，**非法不行**
  const tiny = ['skin_barrier']
  const fixed = repairDeck({ main: Array(9).fill('skin_barrier'), sp: [] }, tiny)
  ok('③ ★ 池子只有 1 张卡时：补不满可以，超限不行', findDeckIssues(fixed) === null)
  ok(`③ 池子只有 1 张时产出上限 = 1×${MAX_SAME_CARD}`, fixed.main.length === MAX_SAME_CARD)
  ok('③ 不传 ownedMainIds 也不崩（只用卡组里已有的卡回填）',
    findDeckIssues(repairDeck(brokenSlot)) === null)
}

// ============ ④ 修好的卡组必须和「新组的」同一个标准 ============
// 修正产出的东西，要能通过和 generateRecommendedDeck 一样的规则检查 —— 两条路一个标准。
{
  const rec = generateRecommendedDeck('body', 'tech', ownedMain, [])
  ok('④ 新生成的卡组本身就健康（两条路同一个判据）',
    findDeckIssues({ main: rec.main, sp: rec.sp }) === null)
  ok('④ 修正后的卡组同样通过同名上限检查',
    overOf(repairDeck(brokenSlot, ownedIds).main, MAX_SAME_CARD).length === 0)
}

// ============ ⑤ 界面接线：标得出来、修得掉、存得下 ============
const db = code(read('src/components/DeckBuilder.jsx'))
ok('⑤ ★ DeckBuilder 引入体检纯核心（内联一份 = 守卫测的不是线上那份）',
  /from\s+'\.\.\/utils\/deckHealth(\.js)?'/.test(db))
ok('⑤ ★ 打开卡组界面就体检每个槽位（findDeckIssues）', /findDeckIssues\(/.test(db))
ok('⑤ ★ 有问题的槽位渲染警告（deck.overLimit）', /deck\.overLimit/.test(db))
ok('⑤ ★ 一键修正按钮调用 repairDeck', /repairDeck\(/.test(db))
ok('⑤ ★ 修正结果要落盘（不落盘 = 下次打开又是坏的）',
  /repairDeck\([\s\S]{0,400}saveDecks\(/.test(db))
ok('⑤ ★ 修正用的是玩家拥有的卡池（不得拿全卡池去补）',
  /repairDeck\([^)]*ownedMainCards|repairDeck\([^)]*ownedIds/.test(db))
// ⚠️ 这条曾写成 /issues/.test(db) —— 太松：源码里别处也有这个词，把「出战」闸门拆掉都不会红
//    （变异测试当场抓到）。改成检查那道闸本身：出战按钮必须挂在 !issues 上。
ok('⑤ ★ 超限的卡组不许直接「出战」（出战按钮必须挂在 !issues 上，否则揣着违规的牌就开打了）',
  /\{slot && !issues && slot\.main\.length === DECK_SIZE && \(/.test(db))
ok('⑤ ★ 超限时改为显示「修正」按钮（不能只是不给出战、又不给出路）',
  /\{slot && issues && \([\s\S]{0,300}handleRepair\(i\)/.test(db))

// ============ ⑥ 中英文键齐 ============
const zh = JSON.parse(read('src/i18n/zh.json'))
const en = JSON.parse(read('src/i18n/en.json'))
for (const k of ['deck.overLimit', 'deck.repair', 'deck.repaired']) {
  ok(`⑥ i18n 键 ${k} 中英文都有`, typeof zh[k] === 'string' && typeof en[k] === 'string')
}

console.log(`\n${fail === 0 ? '✅' : '⚠️'} test-deck-health: 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
