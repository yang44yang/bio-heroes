#!/usr/bin/env node
// onDeath 事件路由回归测试
// 确保被杀方 onDeath 技能(召唤/复活/分裂/治疗)按"死亡卡自己那方"路由，而非攻击方。
// 跟 test-guard 同款：不 import useBattle(避免 ESM 路径解析)，只读源码文本断言接线。
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }

const ub = readFileSync(join(ROOT, 'src/hooks/useBattle.js'), 'utf8')

// 只取 handlePostAttackSkills 函数体(到下一个函数 processEndOfTurnEffects 之前)
const fnStart = ub.indexOf('function handlePostAttackSkills')
const fnEnd = ub.indexOf('function processEndOfTurnEffects')
ok('找到 handlePostAttackSkills 函数', fnStart >= 0)
ok('找到函数结束边界(processEndOfTurnEffects)', fnEnd > fnStart)
const fn = ub.slice(fnStart, fnEnd)

// ① onDeath 的 friendlyField 不再 .filter(Boolean) 删 null 空位
ok('① 函数内不含 playerFieldRef.current.filter(Boolean)(空位 null 被保留)',
  !/playerFieldRef\.current\.filter\(Boolean\)/.test(fn))
ok('① 函数内不含 enemyFieldRef.current.filter(Boolean)(空位 null 被保留)',
  !/enemyFieldRef\.current\.filter\(Boolean\)/.test(fn))

// ② defenderSide 变量定义(被杀方 side)存在
ok('② 定义 defenderSide = side===player ? enemy : player',
  /const\s+defenderSide\s*=\s*side\s*===\s*['"]player['"]\s*\?\s*['"]enemy['"]\s*:\s*['"]player['"]/.test(fn))

// ③ 第二个 applySkillEvents 调用 deathEvents 且用 defenderSide 派生 setter
ok('③ 存在 applySkillEvents(deathEvents, ...) 调用',
  /applySkillEvents\(\s*deathEvents\s*,/.test(fn))
ok('③ deathEvents 的 apply 末参用 defenderSide',
  /applySkillEvents\(\s*deathEvents\s*,[^)]*defenderSide\s*\)/.test(fn))

// ④ 日志循环遍历 [...allEvents, ...deathEvents](onKill + onDeath 都记)
ok('④ 日志循环遍历 [...allEvents, ...deathEvents]',
  /for\s*\(\s*const\s+evt\s+of\s*\[\s*\.\.\.allEvents\s*,\s*\.\.\.deathEvents\s*\]\s*\)/.test(fn))

// 回归保护：deathEvents 不再被 push 进 allEvents(否则会被攻击方 side 重复 apply)
ok('回归: allEvents.push 不再含 deathEvents(两类事件已拆分)',
  !/allEvents\.push\([^)]*deathEvents/.test(fn))
// 回归保护：onKill 仍用攻击方 side apply(穿透/压制溢出逻辑不受影响)
ok('回归: onKill 仍 applySkillEvents(allEvents, ..., side)',
  /applySkillEvents\(\s*allEvents\s*,[^)]*\bside\s*\)/.test(fn))

console.log(`\n${fail === 0 ? '✅' : '⚠️'} 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
