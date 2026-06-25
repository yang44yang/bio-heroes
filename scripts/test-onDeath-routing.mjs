#!/usr/bin/env node
// onDeath 触发 + 路由回归测试
// 2026-06-25 真根因修复（preview 实测确认）：死亡清理从「各路径同步 cleanupDeadCards」改为「提交后 useEffect 扫场」。
//   旧法在 React18 自动批处理下有 eager-bailout 竞态：setter(updater) 延迟到 render 才跑，同步读 dead.length 恒 0
//   → 死卡不进弃牌堆 + onDeath 不触发（齐齐反复实测"干细胞死了不复活"真因，[CLEANUP] dead.length(sync) 实测恒 0）。
//   flushSync 对玩家攻击路径有效，但在 effect/commit 上下文报 "called from inside a lifecycle method" 且不刷新，弃用。
//   改用提交后 effect：读最新 field 扫 currentHp≤0 → onDeath → 进弃牌堆 → 移除，天然覆盖全部死法(含敌方回合杀我方卡)。
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

// ② 死亡清理 = 提交后 useEffect 扫场（真根因修复，见文件头注）
ok('② 顶部 import useEffect', /import\s*\{[^}]*\buseEffect\b[^}]*\}\s*from\s*'react'/.test(ub))
const swStart = ub.indexOf('const processedDeathsRef')
const sweep = swStart >= 0 ? ub.slice(swStart, swStart + 1800) : ''
ok('② processedDeathsRef = useRef(new Set())（按 uid 去重，每张死卡只处理一次）',
  /processedDeathsRef\s*=\s*useRef\(\s*new Set\(\)\s*\)/.test(sweep))
ok('② useEffect 依赖 [playerField, enemyField]（每次提交后扫场）',
  /useEffect\([\s\S]{0,1600}\},\s*\[playerField,\s*enemyField\]\)/.test(sweep))
ok('② effect 扫 currentHp<=0 且跳过已处理(processedDeathsRef.has)',
  /currentHp\s*<=\s*0\s*&&\s*!processedDeathsRef\.current\.has/.test(sweep))
ok('② effect 调 fireOnDeathRef.current(fresh, side)（触发死卡 onDeath）',
  /fireOnDeathRef\.current\?\.\(\s*fresh\s*,\s*side\s*\)/.test(sweep))
ok('② effect 把死卡进弃牌堆', /setDiscardPile\(\s*prev\s*=>\s*\[\s*\.\.\.prev,\s*\.\.\.fresh\s*\]/.test(sweep))
ok('② effect 仅按 deadUids 移除（不误删 onDeath 复活进来的新卡）',
  /deadUids\s*=\s*new Set\(fresh\.map[\s\S]{0,160}deadUids\.has\(c\.uid\)\)\s*\?\s*null/.test(sweep))
ok('② effect 内保留关卡规则 onEnemyCardDeath（孢子蔓延等）', /stageRuleRef\.current\?\.onEnemyCardDeath/.test(sweep))

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

// ⑤ cleanupDeadCards 现为 no-op；effect 对双方场扫场，天然覆盖全部死法（不再依赖各路径手动 cleanup）
ok('⑤ cleanupDeadCards 已降为 no-op (useCallback(() => {}, []))',
  /const cleanupDeadCards\s*=\s*useCallback\(\s*\(\)\s*=>\s*\{\s*\}\s*,\s*\[\]\s*\)/.test(ub))
ok("⑤ effect 对 player + enemy 双方都扫（覆盖己方/敌方、攻击/反击/AOE/中毒/环境/敌方回合全部死亡）",
  /for\s*\(const side of \[\s*'player',\s*'enemy'\s*\]\)/.test(ub))

console.log(`\n${fail === 0 ? '✅' : '⚠️'} 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
