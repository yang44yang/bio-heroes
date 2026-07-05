#!/usr/bin/env node
// battleReducer 纯函数单测（E5c-6）——首个「真正驱动 reducer」的测试：
//   直接 import battleReducer(state, action) 断言 next state，不 grep 源码。
// 这正是整个 E5c 迁移（把棋盘状态从焊死在 useBattle 的 useState 收进可单测的
// 纯 reducer）的产物。覆盖 6 组状态的全部 action + 三条核心不变式：
//   ① 只 spread 被改的一侧 → 未改子树引用不变（防无谓重渲染/动画抖动）
//   ② delta 型（powerbank_add/energy/leader/field updater）同 tick 顺序累加
//   ③ FIELD_UPDATE 的 next===cur 引用相等 bailout
import { battleReducer, initialBattleState } from '../src/engine/battleReducer.js'

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)
// 干净初始态（每个用例独立，避免互相污染）
const fresh = () => JSON.parse(JSON.stringify(initialBattleState))

// ============ 0. 初始态 shape ============
ok('0 initialBattleState 六组状态齐全', (() => {
  const s = initialBattleState
  return s.turn === 1 && s.phase === 'init' && s.winner === null &&
    ['player', 'enemy'].every(side =>
      s[side].powerBank && Array.isArray(s[side].discard) &&
      typeof s[side].energy === 'number' && typeof s[side].leaderHp === 'number' &&
      Array.isArray(s[side].field) && s[side].field.length === 5)
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
ok('② LEADER_DAMAGE 同 tick 多次累减（溢出循环语义）', (() => {
  let s = fresh()
  s = battleReducer(s, { type: 'LEADER_DAMAGE', side: 'enemy', amount: 1000 })
  s = battleReducer(s, { type: 'LEADER_DAMAGE', side: 'enemy', amount: 2000 })
  return s.enemy.leaderHp === 27000
})())
ok('reducer 不碰 winner/phase（纯，胜负判定在调用端）', (() => {
  const n = battleReducer(fresh(), { type: 'LEADER_DAMAGE', side: 'player', amount: 99999 })
  return n.player.leaderHp === 0 && n.winner === null && n.phase === 'init'
})())

// ============ 回合机 turn/phase/winner（E5c-4）============
ok('TURN_SET', battleReducer(fresh(), { type: 'TURN_SET', value: 8 }).turn === 8)
ok('PHASE_SET', battleReducer(fresh(), { type: 'PHASE_SET', phase: 'battle' }).phase === 'battle')
ok('WINNER_SET', battleReducer(fresh(), { type: 'WINNER_SET', winner: 'player' }).winner === 'player')
ok('GAME_OVER 原子设 winner+phase:over', (() => {
  const n = battleReducer(fresh(), { type: 'GAME_OVER', winner: 'enemy' })
  return n.winner === 'enemy' && n.phase === 'over'
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

console.log(`\n${fail === 0 ? '✅' : '⚠️'} battle-reducer 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
