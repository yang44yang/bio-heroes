#!/usr/bin/env node
// 齐齐实测 bug 20260622 三连修回归测试（grep 接线断言，不 import 组件/hook 避 ESM 路径问题）
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0, fail = 0
const ok = (n, c) => { if (c) pass++; else { fail++; console.error(`❌ ${n}`) } }

// ============ bug1: 护盾数值不再压在左上角(与 cost 徽章/☠️ 重叠)，移到顶部正中 ============
const card = readFileSync(join(ROOT, 'src/components/Card.jsx'), 'utf8')
const shieldBlock = card.slice(card.indexOf('{/* 护盾数值'), card.indexOf('{/* 护盾数值') + 260)
ok('bug1: 护盾数值用 left-1/2 -translate-x-1/2(顶部居中)', /left-1\/2\s+-translate-x-1\/2/.test(shieldBlock))
ok('bug1: 护盾数值不再用 top-0 left-0(老的左上角重叠位)', !/top-0 left-0/.test(shieldBlock))

// ============ bug2: SP 召唤门槛改为「只挡第 1-2 回合」(turn<3)，不再用 spCost<=turn 量纲错配卡死高费 SP ============
const ub = readFileSync(join(ROOT, 'src/hooks/useBattle.js'), 'utf8')
// 门槛判定现住在 getSpSummonOutcome（getEligibleSpCards 已是它的薄封装）——
// 2026-07 为「静默蒸发」修复而拆：召不出时要能回答"为什么"，才能提示玩家还差几回合。
// 锚点从 getEligibleSpCards 移到 getSpSummonOutcome，断言的**意图不变**：门槛必须看 spCost 走
// spEarliestSummonTurn，绝不能退回 spCost<=turn 那种量纲错配。
const spFn = ub.slice(ub.indexOf('function getSpSummonOutcome'), ub.indexOf('function getSpSummonOutcome') + 2800)
ok('bug2: 召唤门槛看费用(turn ≥ spEarliestSummonTurn(spCost)，含地板挡早期抢召)',
  /turn\s*>=\s*spEarliestSummonTurn\(sp\.spCost\)/.test(spFn))
ok('bug2: 不再用 spCost<=turn 量纲错配门槛(那会把所有 SP 推到第 5-10 回合，SP 永远出不来)',
  !/sp\.spCost\s*<=\s*(battleStateRef\.current\.)?turn\b/.test(spFn))
ok('bug2: getEligibleSpCards 仍是可用入口(薄封装，不破坏既有调用方)',
  /function getEligibleSpCards[\s\S]{0,200}?getSpSummonOutcome\([^)]*\)\.eligible/.test(ub))
ok('bug2: 仍先收集 candidates 再统一返回(switch 内不直接 return spDeck.filter)',
  /let candidates = \[\]/.test(spFn))

// ============ bug3: spendCoins 同步更新 stateRef，扣款不被 pullCards 覆盖 ============
const eco = readFileSync(join(ROOT, 'src/hooks/useEconomy.js'), 'utf8')
const spendFn = eco.slice(eco.indexOf('const spendCoins'), eco.indexOf('const spendCoins') + 700)
ok('bug3: spendCoins 同步读 stateRef.current', /const prev = stateRef\.current/.test(spendFn))
ok('bug3: spendCoins 同步写 stateRef.current = next', /stateRef\.current = next/.test(spendFn))
ok('bug3: spendCoins 不再是纯函数式 setState(prev=>...)(那样不更新 ref 会被 pullCards 覆盖)',
  !/return setState\(prev =>/.test(spendFn))

console.log(`\n${fail === 0 ? '✅' : '⚠️'} 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
