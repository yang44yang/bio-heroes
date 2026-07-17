#!/usr/bin/env node
// battleReducer 纯函数单测（E5c-6）——首个「真正驱动 reducer」的测试：
//   直接 import battleReducer(state, action) 断言 next state，不 grep 源码。
// 这正是整个 E5c 迁移（把棋盘状态从焊死在 useBattle 的 useState 收进可单测的
// 纯 reducer）的产物。覆盖 6 组状态的全部 action + 三条核心不变式：
//   ① 只 spread 被改的一侧 → 未改子树引用不变（防无谓重渲染/动画抖动）
//   ② delta 型（powerbank_add/energy/leader/field updater）同 tick 顺序累加
//   ③ FIELD_UPDATE 的 next===cur 引用相等 bailout
import { battleReducer, initialBattleState, derivePhase } from '../src/engine/battleReducer.js'
import { MAX_FIELD_SLOTS } from '../src/data/deckRules.js'

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)
// 干净初始态（每个用例独立，避免互相污染）
const fresh = () => JSON.parse(JSON.stringify(initialBattleState))

// ============ 0. 初始态 shape ============
ok('0 initialBattleState 状态齐全（含 S2 的 marks、S3 的 activeSide + 每侧 phase）', (() => {
  const s = initialBattleState
  return s.turn === 1 && s.activeSide === 'player' && s.winner === null &&
    s.phase === undefined &&   // S3：顶层 phase 已废除，真相源是 activeSide + state[side].phase
    ['player', 'enemy'].every(side =>
      s[side].powerBank && Array.isArray(s[side].discard) &&
      typeof s[side].energy === 'number' && typeof s[side].leaderHp === 'number' &&
      // 派生自常量而非写死 —— 这条断言是全仓唯一会因改 MAX_FIELD_SLOTS 变红的，
      // 写死 5 等于让「战场位数量」在测试里又多一个真相源。
      Array.isArray(s[side].field) && s[side].field.length === MAX_FIELD_SLOTS &&
      Array.isArray(s[side].summoned) && Array.isArray(s[side].attacked) &&
      s[side].phase === 'init')
})())
ok('0 未知 action 原样返回同一引用', battleReducer(initialBattleState, { type: 'NOPE' }) === initialBattleState)

// ============ 不变式①：未改子树引用不变 ============
ok('① 改 player 侧 → enemy 子树引用不变', (() => {
  const s = fresh()
  const n = battleReducer(s, { type: 'ENERGY_SET', side: 'player', value: 7 })
  return n.enemy === s.enemy && n.player !== s.player && n.player.energy === 7
})())
ok('① 改顶层 turn → player/enemy 子树引用不变', (() => {
  const s = fresh()
  const n = battleReducer(s, { type: 'TURN_SET', value: 5 })
  return n.player === s.player && n.enemy === s.enemy && n.turn === 5
})())

// ============ Power Bank（E5c-0）============
ok('PB SET 直接设', eq(battleReducer(fresh(), { type: 'POWERBANK_SET', side: 'player', powerBank: { stored: 0, intact: false } }).player.powerBank, { stored: 0, intact: false }))
ok('PB ADD 累加 stored', battleReducer(fresh(), { type: 'POWERBANK_ADD', side: 'enemy', amount: 3 }).enemy.powerBank.stored === 3)
ok('PB ADD 保留 intact', battleReducer(fresh(), { type: 'POWERBANK_ADD', side: 'enemy', amount: 3 }).enemy.powerBank.intact === true)
ok('PB RESTORE 置 intact 不动 stored', (() => {
  let s = fresh(); s.player.powerBank = { stored: 12, intact: false }
  const n = battleReducer(s, { type: 'POWERBANK_RESTORE', side: 'player' })
  return n.player.powerBank.stored === 12 && n.player.powerBank.intact === true
})())
ok('② PB ADD 同 tick 两次顺序累加', (() => {
  let s = fresh()
  s = battleReducer(s, { type: 'POWERBANK_ADD', side: 'player', amount: 4 })
  s = battleReducer(s, { type: 'POWERBANK_ADD', side: 'player', amount: 6 })
  return s.player.powerBank.stored === 10
})())

// ============ 弃牌堆 discard（E5c-1）============
ok('DISCARD_ADD 追加多张', eq(battleReducer(fresh(), { type: 'DISCARD_ADD', side: 'player', cards: [{ uid: 'a' }, { uid: 'b' }] }).player.discard.map(c => c.uid), ['a', 'b']))
ok('DISCARD_SET 整堆替换', eq(battleReducer(fresh(), { type: 'DISCARD_SET', side: 'enemy', pile: [{ uid: 'x' }] }).enemy.discard, [{ uid: 'x' }]))
ok('DISCARD_REMOVE_UID 移除首个匹配', (() => {
  let s = fresh(); s.player.discard = [{ uid: 'a' }, { uid: 'b' }, { uid: 'a' }]
  const n = battleReducer(s, { type: 'DISCARD_REMOVE_UID', side: 'player', uid: 'a' })
  return eq(n.player.discard.map(c => c.uid), ['b', 'a'])   // 只移第一个 a
})())
ok('DISCARD_REMOVE_UID 无匹配 → 原样返回同引用', (() => {
  const s = fresh()
  return battleReducer(s, { type: 'DISCARD_REMOVE_UID', side: 'player', uid: 'nope' }) === s
})())
ok('② DISCARD_ADD 同 tick 累加（不覆盖）', (() => {
  let s = fresh()
  s = battleReducer(s, { type: 'DISCARD_ADD', side: 'player', cards: [{ uid: 'a' }] })
  s = battleReducer(s, { type: 'DISCARD_ADD', side: 'player', cards: [{ uid: 'b' }] })
  return eq(s.player.discard.map(c => c.uid), ['a', 'b'])
})())

// ============ 能量 energy（E5c-2）============
ok('ENERGY_SET 直接设', battleReducer(fresh(), { type: 'ENERGY_SET', side: 'player', value: 9 }).player.energy === 9)
ok('ENERGY_SPEND 扣费', (() => { let s = fresh(); s.player.energy = 10; return battleReducer(s, { type: 'ENERGY_SPEND', side: 'player', cost: 3 }).player.energy === 7 })())
ok('ENERGY_ADD 带 cap 封顶', (() => { let s = fresh(); s.player.energy = 9; return battleReducer(s, { type: 'ENERGY_ADD', side: 'player', amount: 5, cap: 10 }).player.energy === 10 })())
ok('ENERGY_ADD 无 cap 可破上限（打破 PB）', (() => { let s = fresh(); s.enemy.energy = 2; return battleReducer(s, { type: 'ENERGY_ADD', side: 'enemy', amount: 15 }).enemy.energy === 17 })())
ok('② ENERGY_SPEND 同 tick 累减', (() => {
  let s = fresh(); s.player.energy = 10
  s = battleReducer(s, { type: 'ENERGY_SPEND', side: 'player', cost: 2 })
  s = battleReducer(s, { type: 'ENERGY_SPEND', side: 'player', cost: 3 })
  return s.player.energy === 5
})())

// ============ 主人 HP leaderHp（E5c-3）============
ok('LEADER_DAMAGE 扣血、下限 0', battleReducer(fresh(), { type: 'LEADER_DAMAGE', side: 'enemy', amount: 3000 }).enemy.leaderHp === 27000)
ok('LEADER_DAMAGE 不下溢（clamp 0）', (() => { let s = fresh(); s.player.leaderHp = 500; return battleReducer(s, { type: 'LEADER_DAMAGE', side: 'player', amount: 9999 }).player.leaderHp === 0 })())
ok('LEADER_HEAL 带 cap 封顶', (() => { let s = fresh(); s.player.leaderHp = 29500; return battleReducer(s, { type: 'LEADER_HEAL', side: 'player', amount: 2000, cap: 30000 }).player.leaderHp === 30000 })())
ok('LEADER_SET 直接设', battleReducer(fresh(), { type: 'LEADER_SET', side: 'enemy', value: 12345 }).enemy.leaderHp === 12345)
ok('LEADER_APPLY updater 对当前态跑', (() => { let s = fresh(); s.player.leaderHp = 10000; return battleReducer(s, { type: 'LEADER_APPLY', side: 'player', updater: (hp) => hp - 3000 }).player.leaderHp === 7000 })())
ok('LEADER_APPLY 下限 0（不出现负血）', battleReducer(fresh(), { type: 'LEADER_APPLY', side: 'enemy', updater: () => -5000 }).enemy.leaderHp === 0)
// ★ 修 bug：垫片过去读 stale ref 再绝对 LEADER_SET，会抹掉同 tick 已派发的 delta。
//   现在 LEADER_APPLY 的 updater 在 reducer 内对「当前提交态」跑 → 与 delta 可交换、顺序累加。
ok('② LEADER_HEAL(delta) 后 LEADER_APPLY 累加、不覆盖（bio_alert 抹掉透析机回血的回归）', (() => {
  let s = fresh() // player.leaderHp = 30000
  s = battleReducer(s, { type: 'LEADER_DAMAGE', side: 'player', amount: 5000 }) // 25000
  s = battleReducer(s, { type: 'LEADER_HEAL', side: 'player', amount: 1000, cap: 30000 }) // 26000（透析机同 tick 回血）
  s = battleReducer(s, { type: 'LEADER_APPLY', side: 'player', updater: (hp) => Math.max(0, hp - 2000) }) // bio_alert 扣 2000 → 24000
  return s.player.leaderHp === 24000 // 而非旧垫片的 30000-2000=28000（抹掉了 -5000/+1000）
})())
ok('② LEADER_DAMAGE 同 tick 多次累减（溢出循环语义）', (() => {
  let s = fresh()
  s = battleReducer(s, { type: 'LEADER_DAMAGE', side: 'enemy', amount: 1000 })
  s = battleReducer(s, { type: 'LEADER_DAMAGE', side: 'enemy', amount: 2000 })
  return s.enemy.leaderHp === 27000
})())
ok('reducer 不碰 winner/phase（纯，胜负判定在调用端）', (() => {
  const n = battleReducer(fresh(), { type: 'LEADER_DAMAGE', side: 'player', amount: 99999 })
  // 血扣到 0 也不自动判负 —— 胜负由调用端读 battleStateRef 算好再 dispatch GAME_OVER
  return n.player.leaderHp === 0 && n.winner === null && n.player.phase === 'init'
})())

// ============ 回合机 turn/phase/winner（E5c-4）============
ok('TURN_SET', battleReducer(fresh(), { type: 'TURN_SET', value: 8 }).turn === 8)
// --- S3：phase 每侧化 + activeSide + 原子交接 ---
ok('SIDE_PHASE_SET：只改指定侧', (() => {
  const n = battleReducer(fresh(), { type: 'SIDE_PHASE_SET', side: 'player', phase: 'battle' })
  return n.player.phase === 'battle' && n.enemy.phase === 'init'
})())
ok('SIDE_PHASE_SET：同值 → 引用不变（no-op bailout，不变式③）', (() => {
  const a = battleReducer(fresh(), { type: 'SIDE_PHASE_SET', side: 'player', phase: 'main' })
  return battleReducer(a, { type: 'SIDE_PHASE_SET', side: 'player', phase: 'main' }) === a
})())

// ★ TURN_HANDOFF 的**原子性**是 S3 最要命的不变式。
//   若 activeSide 与两侧 phase 分成多次 dispatch，中间那一帧里 activeSide 已是 enemy
//   而 enemy.phase 还没到 main → useAITurn 放行并置 aiRunning=true，随后 gate 全拒
//   → **回合永久锁死**（aiRunning 只在 .finally 复位：抛错会，挂起不会）。
ok('★ TURN_HANDOFF 原子：一次 dispatch 同时到位 activeSide + 两侧 phase', (() => {
  let s = battleReducer(fresh(), { type: 'SIDE_PHASE_SET', side: 'player', phase: 'battle' })
  const n = battleReducer(s, { type: 'TURN_HANDOFF', from: 'player', to: 'enemy' })
  return n.activeSide === 'enemy' && n.player.phase === 'ended' && n.enemy.phase === 'main'
})())
ok('★ TURN_HANDOFF 反向（敌方→玩家）对称', (() => {
  let s = battleReducer(fresh(), { type: 'TURN_HANDOFF', from: 'player', to: 'enemy' })
  s = battleReducer(s, { type: 'SIDE_PHASE_SET', side: 'enemy', phase: 'battle' })
  const n = battleReducer(s, { type: 'TURN_HANDOFF', from: 'enemy', to: 'player' })
  return n.activeSide === 'player' && n.enemy.phase === 'ended' && n.player.phase === 'main'
})())
ok('★ TURN_HANDOFF 后不存在「activeSide 已换、新行动方还没进 main」的中间态', (() => {
  // 穷举一整轮交接，每一步都断言：activeSide 指向谁，谁就必须在 main/battle 之一
  let s = battleReducer(fresh(), { type: 'SIDE_PHASE_SET', side: 'player', phase: 'main' })
  const legal = (st) => ['main', 'battle'].includes(st[st.activeSide].phase)
  const steps = [
    { type: 'SIDE_PHASE_SET', side: 'player', phase: 'battle' },
    { type: 'TURN_HANDOFF', from: 'player', to: 'enemy' },
    { type: 'SIDE_PHASE_SET', side: 'enemy', phase: 'battle' },
    { type: 'TURN_HANDOFF', from: 'enemy', to: 'player' },
  ]
  for (const a of steps) { s = battleReducer(s, a); if (!legal(s)) return false }
  return true
})())
ok('WINNER_SET', battleReducer(fresh(), { type: 'WINNER_SET', winner: 'player' }).winner === 'player')
ok('GAME_OVER 原子设 winner + 两侧 ended（S3：over 不再是相位值，它就是 winner != null）', (() => {
  const n = battleReducer(fresh(), { type: 'GAME_OVER', winner: 'enemy' })
  return n.winner === 'enemy' && n.player.phase === 'ended' && n.enemy.phase === 'ended'
})())

// --- derivePhase：把新形状映射回旧的顶层标量（BattleScreen 20+ 处读取的保险）---
ok('derivePhase: winner != null → over（压过一切）', (() => {
  let s = battleReducer(fresh(), { type: 'SIDE_PHASE_SET', side: 'player', phase: 'main' })
  s = battleReducer(s, { type: 'GAME_OVER', winner: 'player' })
  return derivePhase(s) === 'over'
})())
ok('derivePhase: init / mulligan 是全局节拍（不看 activeSide）', (() => {
  const a = fresh()
  const b = battleReducer(fresh(), { type: 'SIDE_PHASE_SET', side: 'player', phase: 'mulligan' })
  return derivePhase(a) === 'init' && derivePhase(b) === 'mulligan'
})())
ok('derivePhase: activeSide=player → 直接映射 player.phase', (() => {
  const m = battleReducer(fresh(), { type: 'SIDE_PHASE_SET', side: 'player', phase: 'main' })
  const b = battleReducer(m, { type: 'SIDE_PHASE_SET', side: 'player', phase: 'battle' })
  return derivePhase(m) === 'main' && derivePhase(b) === 'battle'
})())
ok("★ derivePhase: activeSide=enemy → 'enemyTurn'（BattleScreen 的橙色标签 + useAITurn 的触发条件）", (() => {
  let s = battleReducer(fresh(), { type: 'SIDE_PHASE_SET', side: 'player', phase: 'battle' })
  s = battleReducer(s, { type: 'TURN_HANDOFF', from: 'player', to: 'enemy' })
  const atMain = derivePhase(s)
  // 敌方内部推进到 battle 后，对外仍必须是 'enemyTurn' —— 否则 useAITurn 的 effect 会重入
  const s2 = battleReducer(s, { type: 'SIDE_PHASE_SET', side: 'enemy', phase: 'battle' })
  return atMain === 'enemyTurn' && derivePhase(s2) === 'enemyTurn'
})())
ok('derivePhase: 全枚举只产出旧模型存在过的值（且绝不产出已删的 animating）', (() => {
  const seen = new Set()
  for (const activeSide of ['player', 'enemy'])
    for (const pp of ['init', 'mulligan', 'main', 'battle', 'ended'])
      for (const w of [null, 'player', 'enemy']) {
        const s = { ...fresh(), activeSide, winner: w, player: { ...fresh().player, phase: pp } }
        seen.add(derivePhase(s))
      }
  const legal = new Set(['init', 'mulligan', 'main', 'battle', 'enemyTurn', 'over'])
  return [...seen].every(v => legal.has(v)) && !seen.has('animating')
})())

// ============ 战场 field（E5c-5）============
ok('FIELD_UPDATE 接受新数组', (() => {
  const arr = [{ uid: 'c1' }, null, null, null, null]
  return battleReducer(fresh(), { type: 'FIELD_UPDATE', side: 'player', value: arr }).player.field === arr
})())
ok('FIELD_UPDATE 接受 updater 函数（对当前场跑）', (() => {
  let s = fresh(); s.player.field = [{ uid: 'a', currentHp: 1000 }, null, null, null, null]
  const n = battleReducer(s, { type: 'FIELD_UPDATE', side: 'player', value: prev => prev.map(c => c ? { ...c, currentHp: c.currentHp - 500 } : c) })
  return n.player.field[0].currentHp === 500
})())
ok('③ FIELD_UPDATE 引用相等 bailout（updater 返回同引用 → 原 state 同引用）', (() => {
  const s = fresh()
  const n = battleReducer(s, { type: 'FIELD_UPDATE', side: 'player', value: prev => prev })
  return n === s
})())
ok('② FIELD_UPDATE 同 tick 两次 updater 顺序累加（第二个见第一个结果）', (() => {
  let s = fresh(); s.enemy.field = [{ uid: 'z', currentHp: 3000 }, null, null, null, null]
  // 模拟：技能事件先 -1000，结算再 -2500 → 3000-1000-2500 = clamp... 用 max(0,...) 由调用端做，这里纯减
  s = battleReducer(s, { type: 'FIELD_UPDATE', side: 'enemy', value: prev => prev.map(c => c && c.uid === 'z' ? { ...c, currentHp: c.currentHp - 1000 } : c) })
  s = battleReducer(s, { type: 'FIELD_UPDATE', side: 'enemy', value: prev => prev.map(c => c && c.uid === 'z' ? { ...c, currentHp: c.currentHp - 500 } : c) })
  return s.enemy.field[0].currentHp === 1500   // 3000-1000-500，第二个 updater 确实见到 2000
})())
ok('① FIELD_UPDATE 改 player 场 → enemy 场引用不变', (() => {
  const s = fresh()
  const n = battleReducer(s, { type: 'FIELD_UPDATE', side: 'player', value: [{ uid: 'p' }, null, null, null, null] })
  return n.enemy.field === s.enemy.field && n.enemy === s.enemy
})())

// ============ 组合：一次结算多 action 序贯（模拟 attack 的 dispatch 队列）============
ok('组合：卡打卡结算序列（双方场扣血 + 各自 delta 都落地）', (() => {
  let s = fresh()
  s.player.field = [{ uid: 'atk', currentHp: 1000 }, null, null, null, null]
  s.enemy.field = [{ uid: 'def', currentHp: 1000 }, null, null, null, null]
  // def 侧扣 1500，atk 侧受反击 1500（两个独立 FIELD_UPDATE，不同侧）
  s = battleReducer(s, { type: 'FIELD_UPDATE', side: 'enemy', value: prev => prev.map(c => c && c.uid === 'def' ? { ...c, currentHp: Math.max(0, c.currentHp - 1500) } : c) })
  s = battleReducer(s, { type: 'FIELD_UPDATE', side: 'player', value: prev => prev.map(c => c && c.uid === 'atk' ? { ...c, currentHp: Math.max(0, c.currentHp - 1500) } : c) })
  return s.enemy.field[0].currentHp === 0 && s.player.field[0].currentHp === 0
})())

// ============ 回合标记 summoned / attacked（S2）============
// 此前是 useBattle 的两个 useRef(new Set())，**一个 Set 装两侧**。收进 reducer 的
// 每侧数组之后，「一卡一回合只能攻击一次」第一次成为 state 的性质，而不是
// 「useAITurn 里那个 for 循环的形状」的副产品 —— 这是镜像测试成立的前提。

ok('MARK_SUMMONED：只标记指定侧', (() => {
  const s = battleReducer(fresh(), { type: 'MARK_SUMMONED', side: 'player', uid: 'player_whale_3' })
  return s.player.summoned.includes('player_whale_3') && s.enemy.summoned.length === 0
})())

ok('MARK_ATTACKED：只标记指定侧（旧共用 Set 的核心缺陷）', (() => {
  const s = battleReducer(fresh(), { type: 'MARK_ATTACKED', side: 'player', uid: 'player_ant_0' })
  return s.player.attacked.includes('player_ant_0') && s.enemy.attacked.length === 0
})())

ok('MARK_*：两侧同 uid 互不干扰（uid 前缀之外的第二道保险）', (() => {
  let s = fresh()
  s = battleReducer(s, { type: 'MARK_ATTACKED', side: 'player', uid: 'whale_3' })
  // 就算 uid 层的 side 前缀哪天被人改回去了，容器层也必须挡住串台
  return s.enemy.attacked.length === 0 && s.player.attacked.length === 1
})())

ok('MARK_*：幂等 —— 重复标记同一 uid 返回同一个 state 引用（对齐 Set.add）', (() => {
  const a = battleReducer(fresh(), { type: 'MARK_SUMMONED', side: 'player', uid: 'x' })
  const b = battleReducer(a, { type: 'MARK_SUMMONED', side: 'player', uid: 'x' })
  return a === b && a.player.summoned.length === 1
})())

ok('MARK_*：uid 为 null/undefined 时不写入（防 has(undefined) 全场塌缩的老坑）', (() => {
  const a = battleReducer(fresh(), { type: 'MARK_ATTACKED', side: 'player', uid: undefined })
  const b = battleReducer(fresh(), { type: 'MARK_SUMMONED', side: 'player', uid: null })
  return a.player.attacked.length === 0 && b.player.summoned.length === 0
})())

ok('UNMARK_SUMMONED：撤销单个 uid（蚁后/进化换卡时对齐旧 Set.delete）', (() => {
  let s = battleReducer(fresh(), { type: 'MARK_SUMMONED', side: 'enemy', uid: 'a' })
  s = battleReducer(s, { type: 'MARK_SUMMONED', side: 'enemy', uid: 'b' })
  s = battleReducer(s, { type: 'UNMARK_SUMMONED', side: 'enemy', uid: 'a' })
  return !s.enemy.summoned.includes('a') && s.enemy.summoned.includes('b')
})())

ok('UNMARK_SUMMONED：不存在的 uid → 引用不变（no-op bailout）', (() => {
  const a = battleReducer(fresh(), { type: 'MARK_SUMMONED', side: 'player', uid: 'x' })
  return battleReducer(a, { type: 'UNMARK_SUMMONED', side: 'player', uid: 'nope' }) === a
})())

ok("MARKS_CLEAR which:'attacked' 只清 attacked，不动 summoned（endMainPhase 的语义）", (() => {
  let s = fresh()
  s = battleReducer(s, { type: 'MARK_SUMMONED', side: 'player', uid: 's1' })
  s = battleReducer(s, { type: 'MARK_ATTACKED', side: 'player', uid: 'a1' })
  s = battleReducer(s, { type: 'MARKS_CLEAR', side: 'player', which: 'attacked' })
  return s.player.attacked.length === 0 && s.player.summoned.includes('s1')
})())

ok("MARKS_CLEAR which:'both' 两种都清（startBattle / startPlayerTurn 的语义）", (() => {
  let s = fresh()
  s = battleReducer(s, { type: 'MARK_SUMMONED', side: 'enemy', uid: 's1' })
  s = battleReducer(s, { type: 'MARK_ATTACKED', side: 'enemy', uid: 'a1' })
  s = battleReducer(s, { type: 'MARKS_CLEAR', side: 'enemy', which: 'both' })
  return s.enemy.summoned.length === 0 && s.enemy.attacked.length === 0
})())

ok('MARKS_CLEAR：只清指定侧 —— 未改的另一侧**引用不变**（不变式①）', (() => {
  let s = fresh()
  s = battleReducer(s, { type: 'MARK_ATTACKED', side: 'enemy', uid: 'e1' })
  const before = s.enemy
  const next = battleReducer(s, { type: 'MARKS_CLEAR', side: 'player', which: 'both' })
  return next.enemy === before && next.enemy.attacked.includes('e1')
})())

ok('MARKS_CLEAR：本来就空 → 整个 state 引用不变（no-op bailout）', (() => {
  const s = fresh()
  return battleReducer(s, { type: 'MARKS_CLEAR', side: 'player', which: 'both' }) === s
})())

// ⚠️ 这一条是「棋盘状态能整棵推给 PvP guest」的护栏。Set 不过 JSON
//    （JSON.stringify(new Set(['a'])) === '{}'）—— 将来谁把 Set/Map/函数塞进这棵树，这里红。
//
// ☠️ **别写 `JSON.stringify(round) === JSON.stringify(s)`** —— 那个比较**恒真**：
//    round 本身就是 JSON.parse(JSON.stringify(s))，两边都过了 stringify，Set 在两边都
//    塌成 `{}`、函数在两边都消失。它对「树里混了 Set/函数」是**结构性瞎的**
//    —— 与 mirror 的不动点盲区同一族。本条初版就是这么写的，是 test-wire-privacy 的
//    变异测试当场抓到的。正解：**直接在树上找非 JSON 类型**，不靠 round-trip 自证。
function findNonJson(v, path = 'state', out = []) {
  if (v === null || typeof v !== 'object') {
    if (typeof v === 'function') out.push(`${path} = function`)
    return out
  }
  const tag = Object.prototype.toString.call(v)
  if (['[object Set]', '[object Map]', '[object Date]', '[object RegExp]'].includes(tag)) {
    out.push(`${path} = ${tag}`); return out
  }
  for (const k of Object.keys(v)) findNonJson(v[k], `${path}.${k}`, out)
  return out
}

ok('★ state 全树 JSON 干净（wire-clean）—— 树上不得有 Set/Map/函数', (() => {
  let s = fresh()
  s = battleReducer(s, { type: 'MARK_SUMMONED', side: 'player', uid: 'player_whale_3' })
  s = battleReducer(s, { type: 'MARK_ATTACKED', side: 'enemy', uid: 'enemy_ant_0' })
  s = battleReducer(s, { type: 'LEADER_DAMAGE', side: 'enemy', amount: 5000 })
  s = battleReducer(s, { type: 'DISCARD_ADD', side: 'player', cards: [{ id: 'ant_soldier', uid: 'player_ant_0' }] })
  const bad = findNonJson(s)
  if (bad.length) { console.error('   非 JSON 类型: ' + bad.join(', ')); return false }
  const round = JSON.parse(JSON.stringify(s))
  // 正向：round-trip 后关键字段仍是**数组**且值对（类型丢失会让 [0] 变 undefined）
  return Array.isArray(round.player.summoned) && round.player.summoned[0] === 'player_whale_3' &&
         Array.isArray(round.enemy.attacked) && round.enemy.attacked[0] === 'enemy_ant_0'
})())

ok('★ findNonJson 自检：它真的抓得住混进来的 Set（否则上面那条是空转）', (() => {
  // ⚠️ 这不是在测生产代码，是在测**守卫本身**。此前这里写的是
  //   `JSON.stringify(new Set()) === '{}'` —— 那只证明了一个 JS 事实，没驱动被守的东西，
  //   是覆盖剧场。现在它真的驱动 findNonJson。
  const withSet = { ...fresh(), player: { ...fresh().player, summoned: new Set(['x']) } }
  const withFn = { ...fresh(), enemy: { ...fresh().enemy, hook: () => {} } }
  return findNonJson(withSet).some(p => p.includes('summoned') && p.includes('Set')) &&
         findNonJson(withFn).some(p => p.includes('hook') && p.includes('function')) &&
         findNonJson(fresh()).length === 0
})())

console.log(`\n${fail === 0 ? '✅' : '⚠️'} battle-reducer 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
