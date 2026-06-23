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

// ============ bug2: SP 召唤加回合门槛(spCost <= 当前回合)，杜绝 1-2 回合出 SP ============
const ub = readFileSync(join(ROOT, 'src/hooks/useBattle.js'), 'utf8')
const spFn = ub.slice(ub.indexOf('function getEligibleSpCards'), ub.indexOf('function getEligibleSpCards') + 2400)
ok('bug2: getEligibleSpCards 末尾按回合过滤 spCost <= turnRef.current',
  /candidates\.filter\(\s*sp\s*=>\s*sp\.spCost\s*<=\s*turnRef\.current\s*\)/.test(spFn))
ok('bug2: 改为先收集 candidates 再统一过滤(不再 switch 内直接 return spDeck.filter)',
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
