#!/usr/bin/env node
// Power Curve 单一权威 + 属性预算校验（决策1，2026-06-29）
//   背景：曾有两张 POWER_CURVE 表打架（deckRules cost6=14000 vs SKILL.md cost6=20000）且都没人 import
//        → 引擎从不校验属性预算。本测试把校验真正接上：
//   ① deckRules.POWER_CURVE（可执行副本）== SKILL.md §3（设计权威）逐档相等 —— 任一侧漂移即报错。
//   ② 每张生物卡（type:'character'）ATK+HP ≤ POWER_CURVE[cost]，且 ATK/HP 均为 500 整数倍、cost∈0..10。
//   事件卡/SP 卡不走 power curve（各有独立平衡），不在校验范围。
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
import cards from '../src/data/cards.js'
import { POWER_CURVE } from '../src/data/deckRules.js'

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }

// ===== ① 解析 SKILL.md §3 的权威表，逐档与代码表比对 =====
const skillMd = readFileSync(join(ROOT, '.claude/skills/bio-heroes-card-designer/SKILL.md'), 'utf8')
const docCurve = {}
for (const m of skillMd.matchAll(/cost\s*(\d+)\s*[：:]\s*ATK\+HP\s*≤\s*(\d+)/g)) {
  docCurve[Number(m[1])] = Number(m[2])
}
ok('SKILL.md §3 解析出 11 档（cost 0-10）', Object.keys(docCurve).length === 11)
for (let c = 0; c <= 10; c++) {
  ok(`cost ${c}: 代码表(${POWER_CURVE[c]}) == SKILL.md(${docCurve[c]})`, POWER_CURVE[c] === docCurve[c])
}
// 防退回：旧死表的标志值（cost3=8000 / cost6=14000）不应再出现
ok('POWER_CURVE 已弃用旧值 cost3=8000', POWER_CURVE[3] !== 8000)
ok('POWER_CURVE 已弃用旧值 cost6=14000', POWER_CURVE[6] !== 14000)

// ===== ② 每张生物卡不超预算 + 数值规范 =====
const chars = cards.filter(c => c.type === 'character')
ok('生物卡数量 > 0（cards.js 正常加载）', chars.length > 0)
const over = [], badCost = [], notMul500 = []
for (const c of chars) {
  const sum = (c.atk || 0) + (c.hp || 0)
  const cap = POWER_CURVE[c.cost]
  if (cap == null || c.cost < 0 || c.cost > 10) { badCost.push(c); continue }
  if (sum > cap) over.push(`${c.name} cost${c.cost} ${c.atk}/${c.hp}=${sum} >${cap}`)
  if ((c.atk % 500) !== 0 || (c.hp % 500) !== 0) notMul500.push(`${c.name} ${c.atk}/${c.hp}`)
}
if (badCost.length) console.error('  cost 越界:', badCost.map(c => `${c.name}(${c.cost})`).join(', '))
if (over.length) console.error('  超预算:\n   ' + over.join('\n   '))
if (notMul500.length) console.error('  非 500 倍数:', notMul500.join(', '))
ok('所有生物卡 cost ∈ 0..10', badCost.length === 0)
ok(`所有生物卡 ATK+HP ≤ POWER_CURVE[cost]（超标 ${over.length} 张）`, over.length === 0)
ok(`所有生物卡 ATK/HP 为 500 整数倍（违规 ${notMul500.length} 张）`, notMul500.length === 0)

console.log(`\n${fail === 0 ? '✅' : '⚠️'} 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
