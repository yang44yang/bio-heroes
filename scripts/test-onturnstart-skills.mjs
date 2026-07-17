#!/usr/bin/env node
// onTurnStart 接线回归测试
// 修复前：useBattle 从不为玩家/敌方场上卡触发 triggerSkills('onTurnStart')，
//         导致 7 个 timing:'onTurnStart' 技能在对战中完全哑火。
// 本测试两层断言：
//   ① 源码接线（grep useBattle / skillRegistry，不 import useBattle 避开 ESM 路径）
//   ② 模板功能（直接 import skillTemplates —— 它无任何 import，可独立加载）
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import {
  passiveEnergy, passiveSummon, passiveRandomBuff, passiveAura, cleanse,
} from '../src/engine/skillTemplates.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }

const ub = readFileSync(join(ROOT, 'src/hooks/useBattle.js'), 'utf8')
const reg = readFileSync(join(ROOT, 'src/engine/skillRegistry.js'), 'utf8')

// ============ ① 源码接线断言 ============

// processTurnStartEffects 函数存在，且遍历己方场上卡 + 全量分派
const fnStart = ub.indexOf('function processTurnStartEffects')
ok('① processTurnStartEffects 函数已定义', fnStart >= 0)
const fnBody = fnStart >= 0 ? ub.slice(fnStart, fnStart + 1600) : ''
ok("① 调用 triggerSkills('onTurnStart', ...)", /triggerSkills\(\s*['"]onTurnStart['"]/.test(fnBody))
// E5c-5：field 迁进 reducer → 读走 battleStateRef.current[side].field
ok('① 遍历己方场上存活卡 (friendlyField: battleStateRef[side].field.filter)',
  /friendlyField:\s*battleStateRef\.current\[side\]\.field\.filter/.test(fnBody))
ok('① 事件走 applySkillEvents 全量分派', /applySkillEvents\(/.test(fnBody))
ok('① 透析主人回血: HEAL+_leaderHeal 转 HEAL_LEADER',
  /evt\.type\s*===\s*['"]HEAL['"]\s*&&\s*evt\._leaderHeal/.test(fnBody))

// 玩家回合 & 敌方回合都接线（对称）
ok("① startPlayerTurn 调用 processTurnStartEffects('player')",
  /processTurnStartEffects\(\s*['"]player['"]\s*\)/.test(ub))
ok("① beginEnemyTurn 调用 processTurnStartEffects('enemy')",
  /processTurnStartEffects\(\s*['"]enemy['"]\s*\)/.test(ub))

// 召唤疲劳边界：玩家 onTurnStart 必须在「清标记」之后调用，
// 否则蚁后新召唤的蚂蚁会被清理抹掉疲劳标记 → 当回合即可攻击（错误）
//
// 锚点更新（S2，2026-07-17）：标记从 useRef(new Set()) 收进 battleReducer 的每侧数组
// （state[side].summoned/.attacked），`summonedThisTurn.current.clear()` 这行不复存在，
// 现在是 startPlayerTurn 里的 `MARKS_CLEAR ... which: 'both'`。
// **不变式没变，理由变了**：不再靠「clear() 同步生效」，而靠 dispatch 按入队顺序结算
// —— MARKS_CLEAR 先入队，processTurnStartEffects 触发的 MARK_SUMMONED 后入队。
// ⚠️ 这仍是 source-grep 守卫，不是真测试：被守的顺序活在 startPlayerTurn（React hook
//    回调）里，Node 没有 renderer 就 invoke 不了。grep 在这里是诚实的工具选择，
//    但它只能证明「文本顺序对」，证明不了运行时顺序 —— 别把它当行为测试用。
const clearIdx = ub.indexOf("dispatch({ type: 'MARKS_CLEAR', side: s, which: 'both' })")
const playerCallIdx = ub.indexOf("processTurnStartEffects('player')")
ok('① 玩家 onTurnStart 在清标记之后（保留新召唤物的召唤疲劳）',
  clearIdx >= 0 && playerCallIdx > clearIdx)

// 敌方能量增益反映到 AI 可用能量（beginEnemyTurn 把 ENERGY_BOOST 累加进 gain）
ok('① 敌方充能反映到返回 gain（ENERGY_BOOST 累加）',
  /e\.type\s*===\s*['"]ENERGY_BOOST['"]/.test(ub) && /let gain =/.test(ub))

// ============ ② skillRegistry：7 技能 timing='onTurnStart' ============
const onTurnStartSkills = [
  'Photosynthesis Supply', 'ATP Burst', 'Colony Summon', 'Rapid Mutation',
  'Detoxification', 'Hemodialysis', 'Super Computation',
]
for (const key of onTurnStartSkills) {
  const re = new RegExp(`'${key}':\\s*\\{[\\s\\S]{0,120}?timing:\\s*(\\[[^\\]]*['"]onTurnStart['"][^\\]]*\\]|['"]onTurnStart['"])`)
  ok(`② 技能 "${key}" 注册且 timing 含 'onTurnStart'`, re.test(reg))
}

// ============ ③ 模板功能：7 技能产出正确事件 ============

// Photosynthesis Supply / ATP Burst → ENERGY_BOOST +1
const eb = passiveEnergy({ card: { currentHp: 1000, name: '向日葵·阳光充能站' } }, { amount: 1 })
ok('③ passiveEnergy → ENERGY_BOOST', eb && eb.type === 'ENERGY_BOOST')
ok('③ passiveEnergy amount=1', eb && eb.amount === 1)

// Colony Summon → SUMMON_CARD（1500/1000 蚂蚁，带召唤疲劳）
const queen = { uid: 'queen', name: '蚁后', currentHp: 1000, maxHp: 1000 }
const summonParams = { id: 'ant_soldier', name: '蚂蚁·微型战士', nameEn: 'Ant Soldier', atk: 1500, hp: 1000, faction: 'nature' }
const sm = passiveSummon({ card: queen, friendlyField: [queen, null, null, null, null] }, summonParams)
ok('③ passiveSummon → SUMMON_CARD', sm && sm.type === 'SUMMON_CARD')
ok('③ 蚂蚁 ATK=1500 HP=1000', sm && sm.card.atk === 1500 && sm.card.hp === 1000 && sm.card.currentHp === 1000)
ok('③ 蚂蚁带召唤疲劳 summonSick=true', sm && sm.card.summonSick === true)
ok('③ 蚂蚁阵营=nature', sm && sm.card.faction === 'nature')
ok('③ 召唤进首个空位 slot=1', sm && sm.slot === 1)

// 边界：战场满（5 张存活）→ findEmptySlot 返回 -1 → 不召唤（杜绝无限刷场/破坏 5 位上限）
const full = Array.from({ length: 5 }, (_, i) => ({ uid: 'f' + i, currentHp: 1000, maxHp: 1000 }))
const smFull = passiveSummon({ card: queen, friendlyField: full }, summonParams)
ok('③ 战场满时蚁后不召唤（返回 null，不破坏 5 位上限）', smFull === null)

// Rapid Mutation → BUFF(atk) 或 HEAL(hp)，amount 500（随机，多跑确保两分支都合法）
let sawBuff = false, sawHeal = false, rbValid = true
for (let i = 0; i < 40; i++) {
  const rb = passiveRandomBuff({ card: { uid: 'amoeba', name: '变形虫', currentHp: 800, maxHp: 1000 } }, { amount: 500 })
  if (!rb) { rbValid = false; break }
  if (rb.type === 'BUFF') { sawBuff = true; if (rb.stat !== 'atk' || rb.amount !== 500) rbValid = false }
  else if (rb.type === 'HEAL') { sawHeal = true; if (rb.amount !== 500) rbValid = false }
  else rbValid = false
}
ok('③ passiveRandomBuff 每次产出合法 BUFF/HEAL(amount=500)', rbValid)
ok('③ passiveRandomBuff 两分支(ATK/HP)均可触发', sawBuff && sawHeal)

// Super Computation → DRAW_CARD（经 passiveAura draw 分派）
const dc = passiveAura({ card: { currentHp: 1000, name: '超级计算' }, turn: 2 }, { effect: 'draw', amount: 1 })
ok('③ passiveAura(draw) → DRAW_CARD', dc && dc.type === 'DRAW_CARD')
ok('③ DRAW_CARD amount=1', dc && dc.amount === 1)

// Detoxification → cleanse one_random：清掉一个负面状态
const liver = { uid: 'liver', name: '肝脏', currentHp: 1000, maxHp: 1000, statuses: [{ type: 'poison', damage: 500, turnsLeft: 2 }] }
const detox = cleanse({ card: liver, friendlyField: [liver] }, { scope: 'all_allies', status_filter: 'one_random' })
ok('③ Detoxification 清除负面状态', liver.statuses.every(s => s.type !== 'poison'))
ok('③ Detoxification 返回事件(日志)', Array.isArray(detox) && detox.length > 0)

// Hemodialysis → cleanse all_negative + 主人回血事件（HEAL/_leaderHeal）
const kidney = { uid: 'kidney', name: '肾脏', currentHp: 1000, maxHp: 1000, statuses: [{ type: 'poison', damage: 500, turnsLeft: 2 }, { type: 'sleep', turnsLeft: 1 }] }
const dialysis = cleanse({ card: kidney, friendlyField: [kidney] },
  { scope: 'all_and_leader', status_filter: 'all_negative', bonus_heal: 1000, bonus_heal_target: 'leader' })
ok('③ Hemodialysis 清除全部负面状态', kidney.statuses.length === 0)
const leaderHeal = (dialysis || []).find(e => e.type === 'HEAL' && e._leaderHeal)
ok('③ Hemodialysis 发主人回血事件(HEAL+_leaderHeal, amount=1000)',
  leaderHeal && leaderHeal.amount === 1000 && leaderHeal.targetUid === '__leader__')

console.log(`\n${fail === 0 ? '✅' : '⚠️'} 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
