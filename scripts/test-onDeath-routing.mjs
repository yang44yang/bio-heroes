#!/usr/bin/env node
// onDeath 触发 + 路由回归测试
// 2026-06-25 重构：onDeath 从 handlePostAttackSkills 的"防守方被直接攻击打死"分支，收口到 cleanupDeadCards
// (所有死亡的唯一清理咽喉)，覆盖反击/AOE/中毒/环境等全部死亡路径。修齐齐实测"干细胞死了不复活"。
// grep 源码接线（不 import useBattle，避 ESM 路径解析）。
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }

const ub = readFileSync(join(ROOT, 'src/hooks/useBattle.js'), 'utf8')

// ① onDeath 统一触发器 fireOnDeathRef（用 ref 持最新闭包，绕开 cleanupDeadCards 是 useCallback([]) 的陷阱）
ok('① 定义 fireOnDeathRef = useRef', /fireOnDeathRef\s*=\s*useRef/.test(ub))
const fodStart = ub.indexOf('fireOnDeathRef.current =')
const fod = fodStart >= 0 ? ub.slice(fodStart, fodStart + 1200) : ''
ok('① fireOnDeathRef 用 triggerSkills(onDeath) 且传 friendlyField + discardPile',
  /triggerSkills\(\s*'onDeath'[\s\S]{0,160}friendlyField[\s\S]{0,80}discardPile/.test(fod))

// ② cleanupDeadCards（所有死亡咽喉）内调用 fireOnDeathRef → 覆盖全部死亡路径
const cleanStart = ub.indexOf('const cleanupDeadCards = useCallback')
const clean = cleanStart >= 0 ? ub.slice(cleanStart, cleanStart + 1300) : ''
ok('② cleanupDeadCards 内调用 fireOnDeathRef.current(dead, side)',
  /fireOnDeathRef\.current\?\.\(\s*dead\s*,\s*side\s*\)/.test(clean))

// ③ 路由：按死卡那方(deadSide)派生 setter（复活/召唤/分裂落到死亡卡自己那方，而非攻击方）
ok('③ fSet 按 deadSide 派生(死卡那方为 friendly)',
  /deadSide\s*===\s*'player'\s*\?\s*setPlayerField\s*:\s*setEnemyField/.test(fod))
ok('③ applySkillEvents 用 fSet/eSet + deadSide',
  /applySkillEvents\(\s*events\s*,\s*fSet\s*,\s*eSet\s*,\s*deadSide\s*\)/.test(fod))
ok('③ friendlyField 用 fRef.current（保留 null 空位，不 .filter(Boolean) 假阴性"没空位"）',
  /friendlyField:\s*fRef\.current/.test(fod) && !/fRef\.current\.filter\(Boolean\)/.test(fod))

// ④ handlePostAttackSkills 不再触发 onDeath（已收口，避免双触发），但仍触发 onKill
const hpStart = ub.indexOf('function handlePostAttackSkills')
const hpEnd = ub.indexOf('function processEndOfTurnEffects')
const hp = (hpStart >= 0 && hpEnd > hpStart) ? ub.slice(hpStart, hpEnd) : ''
ok('④ handlePostAttackSkills 不再含 triggerSkills(onDeath)（防双触发）', !/triggerSkills\(\s*'onDeath'/.test(hp))
ok('④ handlePostAttackSkills 仍触发 onKill（攻击方击杀技能不受影响）', /triggerSkills\(\s*'onKill'/.test(hp))
ok('④ handlePostAttackSkills 不再残留 deathEvents 变量', !/deathEvents/.test(hp))

// ⑤ 非攻击死亡路径也调用 cleanupDeadCards（中毒/环境/混乱）→ 这些路径的死卡才会清理 + 触发 onDeath
ok('⑤ 中毒 tick (processEndOfTurnEffects) 末尾调 cleanupDeadCards',
  /function processEndOfTurnEffects[\s\S]{0,2500}cleanupDeadCards\(side\)/.test(ub))
ok('⑤ 环境事件 applyEnvironmentEvent 调 cleanupDeadCards 双方',
  /function applyEnvironmentEvent[\s\S]{0,1600}cleanupDeadCards\('player'\)[\s\S]{0,120}cleanupDeadCards\('enemy'\)/.test(ub))
ok('⑤ 事件卡 AOE：playEventCard 执行后调 cleanupDeadCards（全球大流行等）',
  /executeEventEffect\(card, 'player'[\s\S]{0,120}cleanupDeadCards/.test(ub))
ok('⑤ cleanupDeadCards 覆盖足够多死亡路径（≥12 处：攻击/反击/中毒/环境/出牌AOE/混乱/事件/SP）',
  (ub.match(/cleanupDeadCards\(/g) || []).length >= 12)

console.log(`\n${fail === 0 ? '✅' : '⚠️'} 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
