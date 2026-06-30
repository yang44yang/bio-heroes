#!/usr/bin/env node
// 图鉴包（dex set）完整性守卫（决策4，2026-06-30）
//   Collection 的分包进度按 DEX_SETS 分组统计。若未来加了带新 set 字段的卡（如 BODY/ANCIENT）
//   却忘了在 src/data/dexSets.js 注册，setStats 就不会统计那一包 → 那些卡在分包进度里"消失"、
//   分包合计 ≠ 总进度。本测试守住：每个出现过的 set 都在 DEX_SETS，且分包合计 == 总卡数。
import cards from '../src/data/cards.js'
import eventCards from '../src/data/eventCards.js'
import spCards from '../src/data/spCards.js'
import { DEX_SETS, setOf } from '../src/data/dexSets.js'
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

// ⑤ BASE 是初始包，endowed 应为 0（预存起点只给新季，避免基础包也显示"已开启"假进度）
const base = DEX_SETS.find(s => s.id === 'BASE')
ok('BASE 基础包 endowed=0（预存起点只给新季）', base && base.endowed === 0)

console.log(`\n${fail === 0 ? '✅' : '⚠️'} 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
