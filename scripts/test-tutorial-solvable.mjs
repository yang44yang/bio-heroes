#!/usr/bin/env node
// 「教学五关**一定走得下去**」的可解性守卫（2026-07-25）
//
// 背景：教学卡死是这个项目复发最多的一类 bug（commit 7ba8cb7 一次修 4 处、3 关无法通关），
// 而它**至今没有任何自动化测试**（TutorialScreen 是 React 组件 + 脚本状态机，Node 起不来 renderer）。
// 已有的 test-tutorial-reward 只测毕业奖励幂等，完全不碰 waitFor / advanceStep。
//
// ☠️ 关键认识：这类 bug **grep 是抓不住的** —— 它在语法上完全合法，本质是
//    「关卡数据的预算算术」与「步骤脚本的要求」不匹配（能量不够 / 攻击者不够 / 卡不可点），
//    只有把规则复刻一遍、穷举小孩可能的点击顺序才能发现。所以本文件走的是
//    「纯逻辑复刻 + 对抗式穷举」，不是 source-grep（末尾另有一小节 grep 锚点守代码侧退化）。
//
// 做法：把 TutorialScreen 的**玩家可达状态机**复刻成纯函数（能量/手牌/战场/敌方/PowerBank/
//   召唤疲劳/已攻击/SP/主人HP），从关卡初始状态做 DFS，穷举**每一步所有合法点击**，
//   看是否存在一条「小孩点得出来、但走不下去」的路径。7 岁小孩会乱点，所以判据必须是
//   **最坏顺序**下也能通关，而不是「存在一条通路」。
//
// 🔴 本守卫写成时，在**未修数据**上抓到两处 100% 复现的硬卡死（先红后绿，非事后补测）：
//   · L3 step7 free_attack：energy 4 而手牌 cost 4/3/2 → 最便宜两张 =5>4 → 场上永远只有 1 张卡；
//     它在 step5 打守护时已进 attackedThisTurn（中间无 end_turn 不重置）→ step7 选不出攻击者。
//   · L5 step5 play_event：energy 5 而手牌 1+1+4=6（事件卡真实 cost 4，注释误写「2费」）→
//     步骤 3/4/5 三连出牌之间没有 end_turn 回能 → 任何顺序都剩一张出不起。
//   两处都**没有逃生阀**（只有 play_card 有「出不起就放行」），结束回合按钮又只在 end_turn 步可点
//   （isClickable:754），唯一出口是「跳过教学」→ 对孩子等于本关报废。
//
// ☠️ 复刻的规则（改了 TutorialScreen 对应逻辑就要同步改这里，否则守卫会说谎）：
//   出牌 handlePlayCard:185-239（cost<=energy、生物要空位、factionRequirement 查弃牌堆标记、
//     play_all 不推进）· 攻击 handleAttack:243-289（!summoned && !attacked、克制 ×1.2、互扣、
//     clear_field 不推进）· 直攻 handleDirectAttack:293-304（只查 summoned，**不查 attacked**）
//   · 结束回合 handleEndTurn:307-322（余能进 bank、maxEnergy+1 上限 10、清两个 Set）
//   · 破罐 handleBreakPowerBank:325-331（intact && stored>0 → energy += stored）
//   · SP handleSummonSp:333-363（spDeck 非空 + 有空位；sp_trex 全场 -3000）
//   · 逃生阀 :437-442（**仅 play_card**）· play_all/clear_field 由 :427-431/:444-449 达成推进
//   · 胜利兜底 :451-458（enemyLeaderHp<=0 且非 acknowledge → 跳末步）
//   · 守护强制 :404-405（有存活守护卡时只能打它）· autoAction :127-153（enemy_attack 单向不反伤）
//
// ⚠️ 诚实声明：这是**规则复刻**，不是跑真组件。它能证明「按我复刻的规则，数据是可解的」，
//    证明不了 React 那边的实现与我复刻的一致 —— 后者靠末尾 grep 锚点 + preview 手动走查。

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { TUTORIAL_LEVELS } from '../src/data/tutorialData.js'
import { MAX_FIELD_SLOTS, FACTION_ADVANTAGE, FACTION_ADVANTAGE_BONUS } from '../src/data/deckRules.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }

// ============ 状态机复刻 ============

const NODE_CAP = 400_000   // 状态爆炸保险丝：宁可报错，也不要静默跑不完就说「没找到死锁」

/** 只保留模拟需要的字段；id 用数组下标（cardById 的 uid 带 Math.random，不能依赖） */
const initState = (level) => {
  const hand = level.getPlayerHand().map((c, i) => ({
    k: `h${i}`, cost: c.cost, atk: c.atk, hp: c.hp, faction: c.faction,
    type: c.type, factionRequirement: c.factionRequirement || null,
  }))
  const enemies = level.getEnemyField().map((c) => c
    ? { atk: c.atk, hp: c.currentHp ?? c.hp, faction: c.faction, guard: !!(c.skills || []).some(s => s.type === 'guard') }
    : null)
  const sp = (level.getPlayerSpDeck ? level.getPlayerSpDeck() : []).map((c, i) => ({
    k: `s${i}`, id: c.id, cost: c.cost, atk: c.atk, hp: c.hp, faction: c.faction, type: c.type,
  }))
  return {
    stepIdx: 0,
    energy: level.playerEnergy,
    maxEnergy: level.playerEnergy,
    hand,
    field: level.playerField().map(() => null),
    enemies,
    sp,
    discard: [],                       // 只用来数阵营标记
    bank: { stored: 0, intact: true },
    summoned: [],                      // uid 列表（用 k）
    attacked: [],
    enemyLeaderHp: level.enemyLeaderHp,
  }
}

const clone = (s) => ({
  ...s,
  hand: s.hand.slice(),
  field: s.field.slice(),
  enemies: s.enemies.map(e => e && { ...e }),
  sp: s.sp.slice(),
  discard: s.discard.slice(),
  bank: { ...s.bank },
  summoned: s.summoned.slice(),
  attacked: s.attacked.slice(),
})

/**
 * 状态指纹。
 * ☠️ 必须做**槽位无关化**，否则 L4 会状态爆炸（5 张手牌的出牌顺序 × 3 个沙袋的攻击顺序
 *    = 数十万个语义等价、只是卡在不同槽位的状态；实测 400k 上限跑不完 → 守卫只能报
 *    「没跑完」而不能说「没死锁」）。把战场/敌方按元组排序即可把「同一批卡换个槽位」合并。
 *
 * ⚠️ 但这个合并**只在没有 enemy_attack 自动动作时才成立**：enemy_attack 打的是
 *    `field.findIndex(c => c)`（第一个非空槽）和 `enemies.find(e => e)`（第一个存活敌人），
 *    也就是**依赖槽位顺序**。若某关同时有 enemy_attack 且双方卡的属性不一致，合并会把
 *    「被打的是谁」这个区别抹掉 → 可能漏报死锁。故由 canonical(level) 逐关判定，
 *    不满足条件就退回精确指纹（宁可慢，不可说谎）。
 */
const canonical = (level) => {
  const hasEnemyAttack = level.steps.some(st => st.autoAction === 'enemy_attack'
    || st.autoAction === 'enemy_kill_cards')
  if (!hasEnemyAttack) return true
  const foeAtks = new Set(level.getEnemyField().filter(Boolean).map(e => e.atk))
  const mineAtks = new Set(level.getPlayerHand().filter(c => c.type !== 'event').map(c => c.hp))
  return foeAtks.size <= 1 && mineAtks.size <= 1
}

const makeKey = (canon) => (s) => {
  const field = s.field.map(c => c && [c.k, c.hp])
  const enemies = s.enemies.map(e => e && [e.atk, e.hp, e.guard])
  const srt = (arr) => arr.map(x => JSON.stringify(x)).sort()
  return JSON.stringify([
    s.stepIdx, s.energy, s.maxEnergy,
    s.hand.map(c => c.k).sort(),
    canon ? srt(field) : field,
    canon ? srt(enemies) : enemies,
    s.sp.map(c => c.k), s.bank.stored, s.bank.intact,
    s.summoned.slice().sort(), s.attacked.slice().sort(), s.enemyLeaderHp,
    s.discard.map(c => c.faction).sort(),   // 只有阵营标记的**计数**被读到，顺序无关
  ])
}

/** 克制加成 —— 必须现算，禁止硬编码 1.2（nature 的 strong 是 null，硬编码会算错） */
const dmgOf = (atkCard, defCard) => {
  const adv = FACTION_ADVANTAGE[atkCard.faction]
  return adv?.strong === defCard.faction
    ? Math.floor(atkCard.atk * (1 + FACTION_ADVANTAGE_BONUS))
    : atkCard.atk
}

const markersOf = (discard) => {
  const m = {}
  for (const c of discard) if (c.faction) m[c.faction] = (m[c.faction] || 0) + 1
  return m
}

/** handlePlayCard:218-226 —— factionRequirement 标记不足则静默 return（点了不动） */
const markerOk = (card, discard) => {
  if (!card.factionRequirement) return true
  const { faction, count } = card.factionRequirement
  return (markersOf(discard)[faction] || 0) >= count
}

const hasEmptySlot = (field) => field.some(s => s === null)
const livingEnemies = (s) => s.enemies.map((e, i) => e && e.hp > 0 ? i : -1).filter(i => i >= 0)
const guardIdx = (s) => s.enemies.findIndex(e => e && e.hp > 0 && e.guard)

/** 可发起攻击的战场卡（attack / clear_field 用：既未召唤疲劳也未攻击过） */
const attackers = (s) => s.field
  .map((c, i) => c && !s.summoned.includes(c.k) && !s.attacked.includes(c.k) ? i : -1)
  .filter(i => i >= 0)

/** 直攻主人可用的卡（handleDirectAttack **不查 attacked**，只查召唤疲劳） */
const directAttackers = (s) => s.field
  .map((c, i) => c && !s.summoned.includes(c.k) ? i : -1)
  .filter(i => i >= 0)

/** 出牌：返回新状态（不推进步骤 —— 推进交给调用方，因为 play_all 不推进） */
function applyPlay(s0, handIdx) {
  const s = clone(s0)
  const card = s.hand[handIdx]
  s.hand.splice(handIdx, 1)
  s.energy -= card.cost
  if (card.type === 'event') {
    // 事件卡不上场（食物链爆发只是给自然系 +ATK，对可解性无影响，故不建模数值）
    s.discard.push(card)
  } else {
    const slot = s.field.findIndex(x => x === null)
    s.field[slot] = { k: card.k, atk: card.atk, hp: card.hp, faction: card.faction }
    s.summoned.push(card.k)
  }
  return s
}

/** 攻击：互扣 + 死亡移除（handleAttack:250-283） */
function applyAttack(s0, atkSlot, defIdx) {
  const s = clone(s0)
  const a = s.field[atkSlot], d = s.enemies[defIdx]
  const dealt = dmgOf(a, d)
  d.hp = Math.max(0, d.hp - dealt)
  if (d.hp <= 0) s.enemies[defIdx] = null
  const back = Math.max(0, a.hp - d.atk)
  if (back <= 0) { s.discard.push({ faction: a.faction }); s.field[atkSlot] = null }
  else s.field[atkSlot] = { ...a, hp: back }
  s.attacked.push(a.k)
  return s
}

function applyEndTurn(s0) {
  const s = clone(s0)
  if (s.bank.intact && s.energy > 0) s.bank.stored += s.energy
  s.maxEnergy = Math.min(s.maxEnergy + 1, 10)
  s.energy = s.maxEnergy
  s.summoned = []
  s.attacked = []
  return s
}

/** advanceStep + autoAction（:119-122 推进后若新步有 autoAction 则执行） */
function advance(s0, level, n = 1) {
  let s = clone(s0)
  s.stepIdx += n
  const step = level.steps[s.stepIdx]
  if (step?.autoAction === 'enemy_attack') {
    const atk = s.enemies.find(e => e && e.hp > 0)
    const defIdx = s.field.findIndex(c => c)
    if (atk && defIdx >= 0) {
      const d = s.field[defIdx]
      const hp = Math.max(0, d.hp - atk.atk)          // 单向：敌方不吃反伤（:150 注释）
      if (hp <= 0) { s.discard.push({ faction: d.faction }); s.field[defIdx] = null }
      else s.field[defIdx] = { ...d, hp }
    }
  } else if (step?.autoAction === 'enemy_kill_cards') {
    let killed = 0
    for (let i = 0; i < s.field.length && killed < 2; i++) {
      if (s.field[i]) { s.discard.push({ faction: s.field[i].faction }); s.field[i] = null; killed++ }
    }
  }
  // 胜利兜底 :451-458 —— 主人已死且当前步不是 acknowledge → 直接跳末步
  if (s.enemyLeaderHp <= 0 && s.stepIdx < level.steps.length
      && level.steps[s.stepIdx]?.waitFor !== 'acknowledge') {
    s.stepIdx = level.steps.length - 1
  }
  return s
}

/**
 * 列出当前步「小孩点得出来」的所有后继状态。
 * 返回 { next: [...], autoAdvanced: bool, reason }：
 *   next 为空且 autoAdvanced 为 false → **死锁**（屏幕上没有任何能推进的可点目标）
 */
function successors(s, level) {
  const step = level.steps[s.stepIdx]
  const w = step.waitFor
  const out = []

  if (w === 'acknowledge') return { next: [advance(s, level)] }

  if (w === 'end_turn') return { next: [advance(applyEndTurn(s), level)] }

  if (w === 'play_card' || w === 'play_event' || w === 'play_all') {
    let playable = s.hand
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.cost <= s.energy
        && (c.type === 'event' || hasEmptySlot(s.field))
        && markerOk(c, s.discard))
    // 高亮点名某一张手牌（highlight: 'hand_card_N'）时，组件只让那一张可点（其余早已压暗成
    // opacity-30 grayscale）。⚠️ 收紧是**有条件的**：被点名那张此刻出不起就退回「随便出」，
    // 否则会绕过 play_card 的逃生阀（它只看「有没有任何一张出得起」）而锁死步骤。
    // 复刻自 TutorialScreen 手牌区的 targetHandIdx / targetPlayable。
    const mTarget = /^hand_card_(\d+)$/.exec(step.highlight || '')
    if (mTarget) {
      const ti = +mTarget[1]
      if (playable.some(({ i }) => i === ti)) playable = playable.filter(({ i }) => i === ti)
    }
    for (const { i } of playable) {
      const played = applyPlay(s, i)
      // play_all 只在手牌空时推进（:427-431）；其余出一张即推进（:209/:238）
      out.push(w === 'play_all'
        ? (played.hand.length === 0 ? advance(played, level) : played)
        : advance(played, level))
    }
    if (out.length === 0) {
      // 逃生阀 :437-442 —— **只有 play_card 有**。判据复刻原文（同样不查 factionRequirement）
      if (w === 'play_card') {
        const canPlayAny = s.hand.some(c => c.cost <= s.energy
          && (c.type === 'event' || hasEmptySlot(s.field)))
        if (!canPlayAny) return { next: [advance(s, level)], autoAdvanced: true }
      }
      return { next: [], reason: `${w} 步无牌可出（能量 ${s.energy}，手牌 cost [${s.hand.map(c => c.cost)}]），且该步没有逃生阀` }
    }
    return { next: out }
  }

  if (w === 'attack' || w === 'clear_field') {
    const gi = guardIdx(s)
    const targets = gi >= 0 ? [gi] : livingEnemies(s)      // 守护强制 :404-405
    for (const a of attackers(s)) {
      for (const d of targets) {
        const after = applyAttack(s, a, d)
        // clear_field 只在敌方全空时推进（:444-449）；attack 打一下就推进（:288）
        out.push(w === 'clear_field'
          ? (livingEnemies(after).length === 0 ? advance(after, level) : after)
          : advance(after, level))
      }
    }
    // ☠️ clear_field **不再**允许点敌方主人绕过（已修）：以前 isClickable('enemy_leader') 和
    //    handleLeaderClick 都放行 clear_field，孩子点一下主人就推进到「场上清空了」那一步，
    //    而敌人还站着 —— 教学当场说谎，且下一步是 direct_attack，剩下的敌人再也清不掉。
    //    删掉这段建模后，「清不掉场」在 ① 里会变成真死锁（③-8 钉死组件侧不许把绕过加回来）。
    if (out.length === 0) {
      return { next: [], reason: `${w} 步选不出攻击者（场上 ${s.field.filter(Boolean).length} 张，`
        + `已攻击 ${s.attacked.length} 张，召唤疲劳 ${s.summoned.length} 张，存活敌方 ${livingEnemies(s).length}），`
        + `且 ${w} 没有逃生阀、结束回合按钮在该步不可点` }
    }
    return { next: out }
  }

  if (w === 'direct_attack') {
    for (const a of directAttackers(s)) {
      const s2 = clone(s)
      s2.enemyLeaderHp = Math.max(0, s2.enemyLeaderHp - s2.field[a].atk)
      s2.attacked.push(s2.field[a].k)
      out.push(advance(s2, level))
    }
    if (out.length === 0) return { next: [], reason: `direct_attack 步场上没有可用卡（${s.field.filter(Boolean).length} 张，召唤疲劳 ${s.summoned.length}）` }
    return { next: out }
  }

  if (w === 'break_power_bank') {
    if (!s.bank.intact || s.bank.stored <= 0) {
      return { next: [], reason: `break_power_bank 步 bank 为空（stored=${s.bank.stored}, intact=${s.bank.intact}）→ 💥 按钮根本不渲染` }
    }
    const s2 = clone(s)
    s2.energy += s2.bank.stored
    s2.bank = { stored: 0, intact: false }
    return { next: [advance(s2, level)] }
  }

  if (w === 'summon_sp') {
    if (s.sp.length === 0 || !hasEmptySlot(s.field)) {
      return { next: [], reason: `summon_sp 步无法召唤（SP 牌 ${s.sp.length} 张，空位 ${s.field.filter(x => x === null).length} 个）` }
    }
    const s2 = clone(s)
    const spCard = s2.sp.shift()
    const slot = s2.field.findIndex(x => x === null)
    s2.field[slot] = { k: spCard.k, atk: spCard.atk, hp: spCard.hp, faction: spCard.faction }
    s2.summoned.push(spCard.k)
    if (spCard.id === 'sp_trex') {                    // 登场 -3000 全场 + 主人
      s2.enemies = s2.enemies.map(e => {
        if (!e) return null
        const hp = Math.max(0, e.hp - 3000)
        return hp <= 0 ? null : { ...e, hp }
      })
      s2.enemyLeaderHp = Math.max(0, s2.enemyLeaderHp - 3000)
    }
    return { next: [advance(s2, level)] }
  }

  return { next: [], reason: `waitFor '${w}' 在 TutorialScreen 里没有任何推进路径（新增了 waitFor 却没接线 → 必然卡死）` }
}

/** DFS 穷举所有可达状态，返回第一条死锁路径（null = 怎么点都能通关） */
function findDeadlock(level) {
  const seen = new Set()
  const key = makeKey(canonical(level))
  let nodes = 0
  const stack = [{ s: initState(level), path: [] }]
  while (stack.length) {
    const { s, path } = stack.pop()
    if (s.stepIdx >= level.steps.length) continue          // 这条路通关了
    if (++nodes > NODE_CAP) return { overflow: true, nodes }
    const k = key(s)
    if (seen.has(k)) continue
    seen.add(k)
    const step = level.steps[s.stepIdx]
    const { next, reason } = successors(s, level)
    if (next.length === 0) {
      return { stepIdx: s.stepIdx, stepId: step.id, waitFor: step.waitFor, reason, path, nodes }
    }
    for (const n of next) stack.push({ s: n, path: [...path, `${step.id}(${step.waitFor})`] })
  }
  return null
}

// ============ ① 可解性：每一关「怎么点都走得下去」 ============

for (const level of TUTORIAL_LEVELS) {
  const dl = findDeadlock(level)
  if (dl?.overflow) {
    ok(`① 关卡${level.id} 状态数超过 ${NODE_CAP} —— 模拟没跑完，不能宣称无死锁（请缩小状态或提高上限）`, false)
    continue
  }
  ok(`① ★ 关卡${level.id}「${level.title || ''}」怎么点都走得下去`
    + (dl ? ` —— 实际在 step${dl.stepIdx} ${dl.stepId}(${dl.waitFor}) 卡死：${dl.reason}｜路径 ${dl.path.join(' → ')}` : ''),
    !dl)
}

// ============ ② 单点结构断言（可解性之外，容易被数值改动悄悄破掉的不变量） ============

for (const level of TUTORIAL_LEVELS) {
  const steps = level.steps
  const hand = level.getPlayerHand()
  const enemies = level.getEnemyField().filter(Boolean)

  // ②-1 clear_field 的**正规路径**（靠攻击清场，不靠点主人绕过）必须真的可行：
  //     把敌人按 HP 降序、玩家卡按有效 ATK 降序贪心配对，每张卡一回合只能攻击一次。
  // ☠️ 这条**不是** ① 的冗余，别当"太严"删掉（变异实测确认）：把 L4 沙袋 HP 从 2000 调回
  //    历史值 2500，① 的 DFS **不会红** —— 因为 successors() 忠实建模了「clear_field 步也能点
  //    敌方主人」这条绕过路径（isClickable:754 + handleLeaderClick:413 确实允许），于是清不掉场
  //    在模型里不构成硬死锁。抓住那次回退的**只有**下面这条贪心配对。
  //    后果虽不是卡死，但同样糟：孩子只能靠点主人绕过，而下一步文案会谎报「场上清空了」。
  if (steps.some(st => st.waitFor === 'clear_field')) {
    const foes = enemies.map(e => e.currentHp ?? e.hp).sort((a, b) => b - a)
    const mine = hand.filter(c => c.type !== 'event')
      .map(c => dmgOf(c, { faction: enemies[0].faction })).sort((a, b) => b - a)
    const matched = foes.filter((hp, i) => mine[i] != null && mine[i] >= hp).length
    ok(`②-1 关卡${level.id} clear_field 可正规清场：${foes.length} 个敌人需要 ${foes.length} 张能一击的卡，`
      + `实有 ${matched} 张匹配（敌方HP [${foes}] vs 我方有效ATK [${mine}]）`
      + ` —— 不足时玩家只能靠「点主人」绕过，提示会谎报「场上清空了」`,
      matched >= foes.length)
  }

  // ②-2 break_power_bank 之前必须至少有一次 end_turn（否则 bank 恒为 0、💥 按钮不渲染）
  const pbIdx = steps.findIndex(st => st.waitFor === 'break_power_bank')
  if (pbIdx >= 0) {
    ok(`②-2 关卡${level.id} break_power_bank(step${pbIdx}) 之前必须有 end_turn 把余能存进 bank`,
      steps.slice(0, pbIdx).some(st => st.waitFor === 'end_turn'))
  }

  // ②-3 注释里标的费用必须与真实卡费一致 —— L5 的「// 2费 事件卡」（真实 4 费）就是那个 bug 的思维源头
  const src = readFileSync(join(ROOT, 'src/data/tutorialData.js'), 'utf8')
  for (const c of hand) {
    const re = new RegExp(`cardById\\('${c.id}'\\)[^\\n]*//[^\\n]*?(\\d+)\\s*费`)
    const m = src.match(re)
    if (m) {
      ok(`②-3 tutorialData 注释说 ${c.id} 是 ${m[1]}费，真实 cost=${c.cost} —— 过期注释会误导下一个人算错预算`,
        +m[1] === c.cost)
    }
  }
}

// ============ ③ grep 锚点：代码侧的推进接线不得退化 ============

const tut = readFileSync(join(ROOT, 'src/components/TutorialScreen.jsx'), 'utf8')
const data = readFileSync(join(ROOT, 'src/data/tutorialData.js'), 'utf8')

// ☠️ 假绿 / 假红都当场发生过：**注释里提到一个名字，不等于代码在用它**。
//    写本次修复时，组件注释里出现了 "targetCardIdx"（把 ③-7 骗绿）和 "clear_field"
//    （把 ③-8 骗红）。所以 ③-6 起的锚点一律跑在**去掉注释后的源码** tutCode 上。
//    ⚠️ ③-5 例外：它靠「兜底逃生阀」这个中文注释来定位代码段，必须用原文 tut。
const tutCode = tut
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:"'`\\])\/\/[^\n]*/gm, '$1')
ok('③-0 注释剥离没把代码一起吃掉（吃掉了下面所有锚点就成了摆设）',
  tutCode.length > tut.length * 0.5 && tutCode.includes('const isClickable'))

// ③-1 多次型步骤（做一次不算达成）必须在 handler 里被排除掉，否则「做第一次就跳步」→ 7ba8cb7 那 4 个 bug
ok('③-1 ★ handlePlayCard 仍排除 play_all（少了 → 出第一张就跳步、剩下的出不去 → L4 卡死）',
  /waitFor\s*!==\s*'play_all'/.test(tut))
ok('③-2 ★ handleAttack 仍排除 clear_field（少了 → 打第一张就喊「场上清空了」、剩下的敌人永远清不掉）',
  /waitFor\s*!==\s*'clear_field'/.test(tut))

// ③-3 三个「达成/放行」useEffect 必须都在（只有正向锁时，把它们删掉上面两条仍然绿）
for (const [name, re] of [
  ['play_all 靠「手牌空」推进', /waitFor\s*===\s*'play_all'\s*&&\s*playerHand\.length\s*===\s*0/],
  ['clear_field 靠「敌方场空」推进', /waitFor\s*===\s*'clear_field'\s*&&\s*enemyField\.every/],
  ['play_card 的「无牌可出就放行」逃生阀', /waitFor\s*!==\s*'play_card'\)\s*return[\s\S]{0,300}canPlayAny/],
]) {
  ok(`③-3 ${name} 的 useEffect 仍在 —— 删掉它这一类步骤就再也推进不了`, re.test(tut))
}

// ③-5 兜底逃生阀必须覆盖**所有没有原生推进路径**的 waitFor（play_card 之外那 6 种）。
//      少一种，那一种一旦资源不足就又是「屏幕上没有可点目标 + 结束回合按钮不可点」= 本关报废。
const valve = tut.slice(tut.indexOf('兜底逃生阀'))
ok('③-5 ★ 兜底逃生阀 useEffect 存在（TutorialScreen 里搜不到 = 回到了「只有 play_card 有兜底」的旧状态）',
  valve.length > 200 && /if\s*\(stuck\)\s*advanceStep\(\)/.test(valve))
if (valve.length > 200) {
  for (const w of ['play_event', 'attack', 'clear_field', 'direct_attack', 'summon_sp', 'break_power_bank']) {
    ok(`③-5 逃生阀覆盖 '${w}'`, new RegExp(`w === '${w}'`).test(valve))
  }
  // 反向锁：逃生阀**不得**接管 play_all/clear_field 的「达成推进」那一半 ——
  // 两个 effect 在同一次提交里都调 advanceStep 会一次跳两步（静默漏掉一整步教学）
  ok('③-5 ★ 逃生阀不得重复处理「手牌空 / 敌方场空」（会与上面两个 effect 同时 advanceStep → 一次跳两步）',
    !/playerHand\.length\s*===\s*0/.test(valve) && !/enemyField\.every/.test(valve))
}

// ③-4 数据里出现的每一种 waitFor 都必须在 successors() 的已知集合里 ——
//      新加一种却没接线 = 必然卡死，而且上面的 DFS 只能在跑到那一步时才发现
const KNOWN = ['acknowledge', 'play_card', 'play_event', 'play_all', 'attack', 'clear_field',
  'direct_attack', 'end_turn', 'break_power_bank', 'summon_sp']
const used = [...new Set([...data.matchAll(/waitFor:\s*'([a-z_]+)'/g)].map(m => m[1]))]
for (const w of used) {
  ok(`③-4 waitFor '${w}' 在本守卫与 TutorialScreen 里都已登记（新增一种就必须两边都接线）`,
    KNOWN.includes(w))
}

// ③-6 ★ 数据里用到的每一个 highlight 区域，TutorialScreen 都必须真的画得出来 ——
//      否则就是「高亮打在空气上」：L3 step0 一边说「敌方有一张守护卡 🛡️——你只能先攻击它」，
//      一边 highlight:'enemy_slot_1'，而组件当时只有 enemy_field / enemy_leader 两个分支，
//      屏幕上什么都不会亮，孩子根本不知道说的是哪一张（同「守护看不出来」那一类：逻辑对了但看不见）。
// ⚠️ 按下标生成的一族（hand_card_N / enemy_slot_N）必须用模板字符串匹配 —— 别退回硬编码 0..3，
//    那样第 5 张手牌/第 6 个槽位又会悄悄没人管。
const DYNAMIC_HIGHLIGHT = [
  [/^enemy_slot_\d+$/, /isHighlighted\(`enemy_slot_\$\{slot\}`\)/],
  [/^hand_card_\d+$/, /isHighlighted\(`hand_card_\$\{idx\}`\)/],
]
const usedHighlights = [...new Set([...data.matchAll(/highlight:\s*'([a-z_0-9]+)'/g)].map(m => m[1]))]
for (const h of usedHighlights) {
  if (h === 'none') continue
  const literal = tutCode.includes(`isHighlighted('${h}')`)
  const dyn = DYNAMIC_HIGHLIGHT.some(([val, src]) => val.test(h) && src.test(tutCode))
  ok(`③-6 ★ highlight '${h}' 在 TutorialScreen 里有对应的渲染分支（没有 = 高亮打在空气上）`, literal || dyn)
}
// 气泡会盖住它指的东西：enemy_slot_N 属于敌方战场，气泡必须和 enemy_field 一样落到底部，
// 否则停在 top 8% 正好压住刚点亮的那张卡（lowerHandledAreas 用 startsWith，写前缀即可）。
ok('③-6 ★ 提示气泡的「放底部」列表包含 enemy_slot（否则气泡盖住被高亮的敌方卡）',
  /lowerHandledAreas\s*=\s*\[[^\]]*'enemy_slot'/.test(tutCode))

// ③-7 ★ 步骤对象里出现的每一个字段都必须真的被消费。
//      死字段是「以为控制了什么、其实没有」的温床：targetCardIdx 曾在 3 个步骤里写着「出第 0 张」，
//      而组件 0 处引用 —— 谁来改教学都会以为出牌顺序被钉住了，实际上点哪张都过。
const KNOWN_DEAD_KEYS = ['arrow']
const stepKeys = [...new Set([...data.matchAll(/^ {6}([a-zA-Z]+):/gm)].map(m => m[1]))]
ok('③-7 步骤字段提取有效（tutorialData 缩进变了就必须同步改这里的正则，否则本条会静默失效）',
  ['id', 'text', 'textEn', 'highlight', 'waitFor'].every(k => stepKeys.includes(k)))
const locIdiom = /\+\s*'En'/.test(tutCode)          // loc(obj, field) 靠 field+'En' 消费所有 xxxEn
for (const k of stepKeys) {
  if (KNOWN_DEAD_KEYS.includes(k)) continue
  const consumed = new RegExp(`\\b${k}\\b`).test(tutCode)
    || (k.endsWith('En') && locIdiom && stepKeys.includes(k.slice(0, -2)))
  ok(`③-7 ★ 步骤字段 '${k}' 在 TutorialScreen 里真的被读到（读不到 = 死字段，会骗下一个改教学的人）`, consumed)
}
// 登记表自清理：某个死字段哪天被实装了，就必须从表里删掉，否则它会替真字段挡住上面那条检查。
// arrow：数据里 54 处、全项目 0 处消费。故意暂留（它记着「气泡该往哪指」的设计意图），
// 但实装前要**逐条校准方向** —— 数据给 hand_card_0 标的是 arrow:'up'，而那一步气泡在 top 8%、
// 手牌在屏幕最下方，照着画就是指反的（本项目刚栽过一次「转屏提示方向修反」）。
for (const k of KNOWN_DEAD_KEYS) {
  ok(`③-7 死字段登记表里的 '${k}' 仍然确实没被消费（实装了就把它从表里删掉）`,
    !new RegExp(`\\b${k}\\b`).test(tutCode))
}

// ③-8 ★ clear_field 不得再能靠「点敌方主人」绕过。
//      旧行为：isClickable('enemy_leader') 与 handleLeaderClick 都放行 clear_field →
//      孩子点一下主人就推进到下一步，而下一步文案是「场上清空了！」，敌人明明还站着；
//      且下一步 waitFor 是 direct_attack，点敌方卡不再攻击 → 剩下的敌人永远清不掉。
const clkIdx = tutCode.indexOf('const isClickable')
const clickable = tutCode.slice(clkIdx, clkIdx + 800)
ok("③-8 ★ isClickable('enemy_leader') 不再放行 clear_field（放行 = 点一下主人就跳到「场上清空了」）",
  /case 'enemy_leader':/.test(clickable) && !/case 'enemy_leader':[^\n]*clear_field/.test(clickable))
ok("③-8 反向锁：isClickable('enemy_leader') 仍放行 direct_attack（连它也删了，最后一步直攻主人就点不动）",
  /case 'enemy_leader':[^\n]*direct_attack/.test(clickable))
const lcIdx = tutCode.indexOf('const handleLeaderClick')
ok('③-8 ★ handleLeaderClick 不再受理 clear_field',
  lcIdx >= 0 && !/clear_field/.test(tutCode.slice(lcIdx, lcIdx + 500)))
// 光堵住点击还不够：主人面板此前只要「选中了攻击者」就亮红框 + 闪 TAP，
// 于是 clear_field 步骤仍在邀请孩子点一个点了没反应的地方 —— 邀请也要一起撤掉。
ok('③-8 ★ 敌方主人的红框 / TAP 提示改由「主人此刻真的可打」决定（leaderTargetable）',
  /leaderTargetable\s*=\s*selectedAtkSlot !== null && isClickable\('enemy_leader'\)/.test(tutCode))

// ③-9 ★ 手牌被点名（highlight:'hand_card_N'）时，只有那一张真的点得动。
//      旧行为：其余卡已经被压暗成 opacity-30 grayscale（和 🔒 锁住的卡长得一模一样），却照样点得出牌
//      —— L1 说「点击这张蚂蚁卡」，点蜜蜂也照样过关，屏幕在骗人。successors() 已按收紧后的规则建模，
//      组件不实现的话守卫就在说谎（纪律①）。
ok('③-9 ★ 手牌区按「被点名的那一张」收紧可点范围（targetHandIdx / targetPlayable）',
  /targetHandIdx/.test(tutCode) && /!targetPlayable \|\| idx === targetHandIdx/.test(tutCode))
// 反向锁：收紧必须是**有条件的**。被点名那张此刻出不起（能量/空位/阵营标记）时要退回「随便出」，
// 否则会绕过 play_card 的逃生阀（它只看「有没有任何一张出得起」）→ 步骤锁死 = 本关报废。
ok('③-9 ★ 收紧带退路：targetPlayable 要查 cost/能量与空位，出不起就不收紧',
  /targetPlayable[\s\S]{0,400}cost\s*<=\s*playerEnergy/.test(tutCode))

console.log(`\n${fail === 0 ? '✅' : '⚠️'} test-tutorial-solvable: 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
