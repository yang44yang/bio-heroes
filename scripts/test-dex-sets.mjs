#!/usr/bin/env node
// 图鉴包（dex set）完整性守卫（决策4，2026-06-30）
//   Collection 的分包进度按 DEX_SETS 分组统计。若未来加了带新 set 字段的卡（如 BODY/ANCIENT）
//   却忘了在 src/data/dexSets.js 注册，setStats 就不会统计那一包 → 那些卡在分包进度里"消失"、
//   分包合计 ≠ 总进度。本测试守住：每个出现过的 set 都在 DEX_SETS，且分包合计 == 总卡数。
import { readFileSync } from 'fs'
import cards from '../src/data/cards.js'
import eventCards from '../src/data/eventCards.js'
import spCards from '../src/data/spCards.js'
import { DEX_SETS, setOf, ALL_DEX_CARDS, TOTAL_DEX_CARDS, ownedDexCount } from '../src/data/dexSets.js'
import { COLLECTION_ACHIEVEMENTS } from '../src/data/achievements.js'

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }

const allCards = [...cards, ...eventCards, ...spCards]
const setIds = new Set(DEX_SETS.map(s => s.id))

// ① 每张卡的归包都在 DEX_SETS（无 set 归 BASE，所以真正防的是"有 set 但没注册"）
const orphan = allCards.filter(c => !setIds.has(setOf(c)))
if (orphan.length) console.error('  未注册包的卡:', [...new Set(orphan.map(c => c.set))].join(', '))
ok(`每张卡的 set 都在 DEX_SETS 注册（孤儿 ${orphan.length}）`, orphan.length === 0)

// ② 分包合计 == 总卡数（分包进度不漏卡、不重复）
const sum = DEX_SETS.reduce((n, s) => n + allCards.filter(c => setOf(c) === s.id).length, 0)
ok(`分包合计 ${sum} == 总卡数 ${allCards.length}`, sum === allCards.length)

// ③ DEX_SETS 字段完整 + id 唯一
ok('DEX_SETS id 唯一', new Set(DEX_SETS.map(s => s.id)).size === DEX_SETS.length)
for (const s of DEX_SETS) {
  ok(`${s.id} 有 name/nameEn/icon/color`, !!s.name && !!s.nameEn && !!s.icon && !!s.color)
  ok(`${s.id} endowed 为非负数`, typeof s.endowed === 'number' && s.endowed >= 0)
}

// ④ rewardAchId 指向真实的收集成就（集齐奖励钩子不能断头）
const achIds = new Set(COLLECTION_ACHIEVEMENTS.map(a => a.id))
for (const s of DEX_SETS) {
  if (s.rewardAchId) ok(`${s.id} 的 rewardAchId「${s.rewardAchId}」是真实成就`, achIds.has(s.rewardAchId))
}

// ④b 集齐奖励的 requiredCards 必须真属于该包 —— 否则「集齐该季包解锁」名不副实。
//    修 bug（2026-07-12）：OCEAN/MICRO 的 rewardAchId 曾误指 apex_predator/microbe_explorer，
//    三张 requiredCards 全是 BASE 卡，导致集齐 11 张 OCEAN / 9 张 MICRO 对奖励进度贡献 0。
for (const s of DEX_SETS) {
  if (!s.rewardAchId) continue
  const ach = COLLECTION_ACHIEVEMENTS.find(a => a.id === s.rewardAchId)
  if (!ach) continue // 断头情况上面 ④ 已报
  const offPack = (ach.requiredCards || []).filter(id => {
    const card = allCards.find(c => c.id === id)
    return card && setOf(card) !== s.id
  })
  ok(`${s.id} 集齐奖励「${s.rewardAchId}」的 requiredCards 全属于 ${s.id} 包（越包卡: ${offPack.join(',') || '无'}）`, offPack.length === 0)
}

// ⑤ BASE 是初始包，endowed 应为 0（预存起点只给新季，避免基础包也显示"已开启"假进度）
const base = DEX_SETS.find(s => s.id === 'BASE')
ok('BASE 基础包 endowed=0（预存起点只给新季）', base && base.endowed === 0)

// ⑥ 单一权威卡池：TOTAL_DEX_CARDS / ALL_DEX_CARDS 与「生物+事件+SP」全集一致。
//    修 bug（2026-07-05）：Gacha「图鉴进度」曾用 138（生物+可抽SP）、Collection 用 157（全部），
//    两屏同叫"图鉴进度"却总数打架。现在两屏都从 dexSets 的 TOTAL_DEX_CARDS 取数，同源。
ok(`ALL_DEX_CARDS 全集 == 生物+事件+SP (${allCards.length})`, ALL_DEX_CARDS.length === allCards.length)
ok(`TOTAL_DEX_CARDS (${TOTAL_DEX_CARDS}) == 全集卡数 (${allCards.length})`, TOTAL_DEX_CARDS === allCards.length)

// ⑦ grep 锚点：Gacha 与 Collection 的图鉴进度分母都必须用 TOTAL_DEX_CARDS（防两屏再各算各的漂移）
const gacha = readFileSync(new URL('../src/components/GachaScreen.jsx', import.meta.url), 'utf8')
const collection = readFileSync(new URL('../src/components/Collection.jsx', import.meta.url), 'utf8')
ok('GachaScreen 图鉴进度分母用 TOTAL_DEX_CARDS', /owned\s*\/\s*TOTAL_DEX_CARDS/.test(gacha))
ok('GachaScreen 不再用「cardsData.length + spCardsData…」当图鉴分母', !/cardsData\.length\s*\+\s*spCardsData/.test(gacha))
ok('Collection 图鉴总数用 TOTAL_DEX_CARDS', /TOTAL_CARDS\s*=\s*TOTAL_DEX_CARDS/.test(collection))
ok('Collection 不再本地拼 [...cards, ...eventCards, ...spCards]', !/\[\s*\.\.\.cards\s*,\s*\.\.\.eventCards/.test(collection))

// ⑧ ownedDexCount：收集进度分子只数「当前卡池内拥有的卡」，天然 ≤ 总数、忽略陈旧 key。
//    防御性硬化（2026-07-05）：Collection/Gacha/Title 曾用 Object.keys(collection).length，
//    今日安全（无陈旧 key），但将来删/改卡后老存档残留 id 会让「已收集 > 总数」（同前两个 bug 的根）。
{
  const firstId = ALL_DEX_CARDS[0].id
  ok('⑧ ownedDexCount 忽略陈旧/不存在的 key', ownedDexCount({ [firstId]: 1, ghost_removed_card: 1, 'stage_x': 3 }) === 1)
  ok('⑧ ownedDexCount 空收藏 → 0（且不抛）', ownedDexCount({}) === 0 && ownedDexCount(undefined) === 0)
  const full = Object.fromEntries(ALL_DEX_CARDS.map(c => [c.id, 1]))
  ok(`⑧ 全拥有 → ownedDexCount == TOTAL_DEX_CARDS (${TOTAL_DEX_CARDS})`, ownedDexCount(full) === TOTAL_DEX_CARDS)
  // 大量陈旧 key 也不会撑爆分子
  const polluted = { ...full }
  for (let i = 0; i < 50; i++) polluted['ghost_' + i] = 9
  ok('⑧ 50 个陈旧 key 污染下 ownedDexCount 仍 == 总数（不超标）', ownedDexCount(polluted) === TOTAL_DEX_CARDS)
  // count:0 的卡不算拥有（与图鉴 isOwn 的 truthy 判定一致）
  ok('⑧ count 为 0 的卡不计入（与 isOwn truthy 一致）', ownedDexCount({ [firstId]: 0 }) === 0)

  // grep 锚点：三处显示收集数都走 ownedDexCount，不再用 Object.keys(collection).length 当分子
  const coll = readFileSync(new URL('../src/components/Collection.jsx', import.meta.url), 'utf8')
  const gacha2 = readFileSync(new URL('../src/components/GachaScreen.jsx', import.meta.url), 'utf8')
  const title = readFileSync(new URL('../src/components/TitleScreen.jsx', import.meta.url), 'utf8')
  ok('⑧ Collection ownedCount 用 ownedDexCount', /ownedCount\s*=\s*ownedDexCount\(/.test(coll))
  ok('⑧ Gacha 收集数用 ownedDexCount（含 beforeCount 里程碑）', /owned\s*=\s*ownedDexCount\(/.test(gacha2) && /beforeCount\s*=\s*ownedDexCount\(/.test(gacha2))
  ok('⑧ Title 收集数用 ownedDexCount', title.includes('ownedDexCount(economy.collection)'))
}

console.log(`\n${fail === 0 ? '✅' : '⚠️'} 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
