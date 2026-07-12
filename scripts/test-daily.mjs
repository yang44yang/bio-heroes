#!/usr/bin/env node
// 每日挑战逻辑断言：确定性轮换 / 周日自由日 / 卡ID有效性 / streak 接龙·重置·护栏·幂等 / 奖励阶梯
import {
  getDailyChallenge, computeStreakUpdate, computeReward,
  dayOfWeek, prevDateStr, localDateStr,
  THEMES, ENEMY_POOL, CONSTRAINTS, SUNDAY_CONSTRAINT,
} from '../src/data/dailyChallenges.js'
import cards from '../src/data/cards.js'
import eventCards from '../src/data/eventCards.js'
import spCards from '../src/data/spCards.js'

const validIds = new Set([...cards, ...eventCards, ...spCards].map(c => c.id))
const FACTIONS = new Set(['nature', 'body', 'pathogen', 'tech'])
let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }

// ---- 确定性 ----
const a = getDailyChallenge('2026-06-21')
const b = getDailyChallenge('2026-06-21')
ok('确定性：同日期同结果', a.constraint.id === b.constraint.id && a.theme.id === b.theme.id && a.enemyConfig.stageName === b.enemyConfig.stageName)
ok('id 形如 daily_YYYY-MM-DD', a.id === 'daily_2026-06-21')

// ---- 30 天多样性 ----
const combos = new Set()
for (let i = 0; i < 30; i++) {
  const ds = localDateStr(new Date(Date.parse('2026-06-01T00:00:00') + i * 86400000))
  const c = getDailyChallenge(ds)
  combos.add(`${c.theme.id}|${c.enemyConfig.stageName}|${c.constraint.id}`)
}
ok('30 天内组合多样(≥12 种不重样)', combos.size >= 12)

// ---- 周日自由日 ----
let sundayFound = false
for (let i = 0; i < 7; i++) {
  const ds = localDateStr(new Date(Date.parse('2026-06-21T00:00:00') + i * 86400000))
  if (dayOfWeek(ds) === 0) {
    sundayFound = true
    ok('周日 → 自由日(free_day)', getDailyChallenge(ds).constraint.id === 'free_day')
    ok('周日 isSunday=true', getDailyChallenge(ds).isSunday === true)
  }
}
ok('测试窗口里找到了周日', sundayFound)

// ---- 卡 ID 有效性(最大风险) ----
const badIds = []
for (const e of ENEMY_POOL) for (const id of e.deck) if (!validIds.has(id)) badIds.push(`enemy:${id}`)
for (const c of CONSTRAINTS) for (const id of (c.effect.preplaceEnemyCards || [])) if (!validIds.has(id)) badIds.push(`preplace:${id}`)
for (const id of (SUNDAY_CONSTRAINT.effect.preplaceEnemyCards || [])) if (!validIds.has(id)) badIds.push(`sunday:${id}`)
for (const t of THEMES) if (!validIds.has(t.cardId)) badIds.push(`theme:${t.cardId}`)
for (const t of THEMES) if (!FACTIONS.has(t.faction)) badIds.push(`themeFaction:${t.faction}`)
ok(`所有引用卡 ID + 主题阵营都有效${badIds.length ? ' → ' + badIds.join(',') : ''}`, badIds.length === 0)

// ---- 约束 effect 合法性 ----
const badFilter = []
for (const c of [...CONSTRAINTS, SUNDAY_CONSTRAINT]) {
  const f = c.effect.playerStartingHandBonus?.filter
  if (f && !FACTIONS.has(f)) badFilter.push(`${c.id}:${f}`)
}
ok(`startingHandBonus.filter 都是合法阵营${badFilter.length ? ' → ' + badFilter.join(',') : ''}`, badFilter.length === 0)
ok('约束正负各半(buff/constraint)', CONSTRAINTS.filter(c => c.kind === 'buff').length === CONSTRAINTS.filter(c => c.kind === 'constraint').length)

// ---- v2 扩池：池子规模 + 轮换新鲜度 + globalEffect 契约 ----
ok(`THEMES ≥ 10（v2 扩池，实 ${THEMES.length}）`, THEMES.length >= 10)
ok(`ENEMY_POOL ≥ 8（v2 扩池，实 ${ENEMY_POOL.length}）`, ENEMY_POOL.length >= 8)
ok(`CONSTRAINTS ≥ 14（v2 扩池，实 ${CONSTRAINTS.length}）`, CONSTRAINTS.length >= 14)
// 轮换新鲜度：连续 14 天约束应 ≥4 种（旧 dn>>4=每16天才换→只1-2种；防回退到"连着两周同一个修正"）
{
  const ids = new Set()
  for (let i = 0; i < 14; i++) ids.add(getDailyChallenge(localDateStr(new Date(Date.parse('2026-06-01T00:00:00') + i * 86400000))).constraint.id)
  ok(`轮换新鲜度：14 天内约束 ≥4 种（实 ${ids.size}）`, ids.size >= 4)
}
// globalEffect 只能用引擎已实现的 antibiotic_weakened（用别的值需改 useBattle，就不是纯扩池了 → 防脚枪）
{
  const badGlobal = [...CONSTRAINTS, SUNDAY_CONSTRAINT].filter(c => c.effect.globalEffect && c.effect.globalEffect !== 'antibiotic_weakened')
  ok(`globalEffect 只用引擎已实现值${badGlobal.length ? ' → ' + badGlobal.map(c => c.id).join(',') : ''}`, badGlobal.length === 0)
}

// ---- streak ----
ok('首次完成 → streak=1', computeStreakUpdate({}, '2026-06-21').next.currentStreak === 1)
ok('昨天完成 → 接龙 +1', computeStreakUpdate({ lastCompleteDate: '2026-06-20', currentStreak: 4, maxStreak: 4 }, '2026-06-21').next.currentStreak === 5)
const gap = computeStreakUpdate({ lastCompleteDate: '2026-06-18', currentStreak: 9, maxStreak: 9 }, '2026-06-21')
ok('断签(gap≥2) → 重置为 1', gap.next.currentStreak === 1)
ok('断签后 maxStreak 仍保留 9', gap.next.maxStreak === 9)
ok('今天已完成 → status already + 不变', (() => { const r = computeStreakUpdate({ lastCompleteDate: '2026-06-21', currentStreak: 3 }, '2026-06-21'); return r.status === 'already' && r.next.currentStreak === 3 })())
ok('时间回拨(last>today) → status rollback 不发奖', computeStreakUpdate({ lastCompleteDate: '2026-06-22', currentStreak: 3 }, '2026-06-21').status === 'rollback')
ok('接龙更新 maxStreak', computeStreakUpdate({ lastCompleteDate: '2026-06-20', currentStreak: 6, maxStreak: 6 }, '2026-06-21').next.maxStreak === 7)
ok('prevDateStr 跨月正确', prevDateStr('2026-07-01') === '2026-06-30')

// ---- 奖励 ----
const ch = getDailyChallenge('2026-06-21')
const rWin = { won: true, leaderHPPercent: 50, turnsPlayed: 20 }
ok('streak1 基础金币 110', computeReward(ch, rWin, 1).coins === 110)
ok('streak7 基础封顶 170', computeReward(ch, rWin, 7).coins === 170)
ok('streak10 仍封顶(cap=7) 170', computeReward(ch, rWin, 10).coins === 170)
ok('满血(≥80%) +50 加成', computeReward(ch, { won: true, leaderHPPercent: 85, turnsPlayed: 20 }, 1).coins === 160)
ok('streak7 → 给 SSR 券', computeReward(ch, rWin, 7).ssrTicket === true)
ok('streak6 → 不给 SSR 券', computeReward(ch, rWin, 6).ssrTicket === false)
ok('streak3 → 给碎片(1-3)', (() => { const f = computeReward(ch, rWin, 3); return f.fragmentCount >= 1 && f.fragmentCount <= 3 && validIds.has(f.fragmentCardId) })())
ok('streak4 → 不给碎片', computeReward(ch, rWin, 4).fragmentCount === 0)
// 速通：找一个带 maxTurns 的挑战验证
const blitzDay = (() => { for (let i = 0; i < 64; i++) { const ds = localDateStr(new Date(Date.parse('2026-06-01T00:00:00') + i * 86400000)); const c = getDailyChallenge(ds); if (c.maxTurns) return c } return null })()
ok('存在带 maxTurns 的挑战(速战速决会轮到)', !!blitzDay)
if (blitzDay) ok('达成回合上限 → 速通 +50', computeReward(blitzDay, { won: true, leaderHPPercent: 30, turnsPlayed: blitzDay.maxTurns }, 1).speedBonus === true)

console.log(`\n${fail === 0 ? '✅' : '⚠️'} 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
