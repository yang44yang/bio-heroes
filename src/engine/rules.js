// rules.js —— 战斗规则的守门人。纯谓词，side 参数化，Node 可直测。
//
// 为什么有这个文件（2026-07-17，de-fork S1）：
//   规则此前全部住在 useBattle 的 useCallback 里，写成 `if (phase !== 'main') return`。
//   那意味着两件坏事：
//   ① **测不了。** useBattle 是 React hook —— Node 能 import 模块（commit 6cffff1 补了
//      .js 扩展名），但没有 renderer 就 invoke 不了 hook。于是「规则对不对」这个问题，
//      历史上只能靠 readFileSync + 正则匹配源码文本来假装回答（见 test-guard.mjs:3、
//      test-onDeath-routing.mjs:8 的注释）。
//   ② **只有一侧有。** 玩家路径查守护/能量/一卡一次，AI 路径（aiAttack/aiPlayToField）
//      一样都不查 —— 因为 AI 走的是另一份近重复实现（ARCHITECTURE.md:51 点名的债）。
//      PvP 里 guest 会走 AI 那条路 → 一个七岁小孩的对手能无视守护、能量超支、
//      一张卡攻击六次。
//
//   把 gate 抽成「state 的纯函数」同时解决这两件事：能真断言，且**同一个函数为两侧服务**。
//
// ★ side-blind 设计：本文件**不得出现 'player'/'enemy' 字面量**。
//   这不是洁癖 —— 一个不能命名某一侧的模块，在结构上就无法偏袒某一侧。
//   它也不是空想：src/engine 的其余模块（combat/aiTarget/statusEffects/stageRules/
//   bossMechanics）与 utils/{damage,guardSkill,factionMarkers} **今天已经全部零侧别
//   字面量** —— side-blindness 早就是这个目录的事实房规，只是没人写下来。
//   scripts/test-no-side-fork.mjs（S7）把它变成不可回归的棘轮。
//
// ⚠️ **拒绝顺序即规则**，抽取时逐字复刻，不得「顺手理顺」：
//   sleep → (confused) → fatigue → attacked。
//   confused 是**重定向而非阻断**（攻击自己人），优先级夹在 sleep 之后 fatigue 之前
//   （useBattle.js 的既有注释明写）。它带副作用（随机挑友方 + 扣血），**不属于纯谓词**
//   → 留在外壳。所以本文件返回的是 canCardAttack 的原始 gate 形状，让外壳保持
//   「先看 sleep、再看 confused、再看 fatigue/attacked」的交错。搬进来就是在提取
//   commit 里偷改规则。
//
// ⚠️ 本文件返回 **reason code**，不返回给玩家看的文案。文案是表现层，留在外壳
//   （它要拼 FACTIONS 名字、要加 🔴 前缀区分双方、将来还要走 i18n）。
//
// ⚠️ 必须带 .js 扩展名 import：Node ESM 不做扩展名补全，漏了只有 npm test 会红。

import { MAX_FIELD_SLOTS } from '../data/deckRules.js'
import { canCardAttack } from './combat.js'
import { fieldHasGuard, cardHasGuard, attackerBypassesGuard } from '../utils/guardSkill.js'
import { canPlayWithMarkers } from '../utils/factionMarkers.js'
import { opp, isSide } from './sides.js'

/** 统一的判定结果。ok=true 时 reason 恒为 null。 */
const OK = { ok: true, reason: null }
const no = (reason) => ({ ok: false, reason })

function assertSide(side, fn) {
  if (!isSide(side)) throw new Error(`${fn}: side 非法 —— ${JSON.stringify(side)}`)
}

/**
 * 能否把这张卡打到这个格子。
 *
 * 复刻 useBattle.playToField 的前四道检查，逐条同序：
 *   phase → energy → slot 越界 → factionRequirement
 *
 * ⚠️ **格子被占用不是拒绝理由** —— 替换是特性不是错误（占位者会进弃牌堆）。
 *   playToField 取出占位者当 `replaced` 返回，从不因此拒绝。别「顺手补一道占用检查」。
 *
 * @param {Object} state - battleReducer 的 state（整棵树）
 * @param {'player'|'enemy'} side - 出牌方
 * @param {Object} card - 卡牌数据（需要 cost / factionRequirement）
 * @param {number} slotIdx
 * @returns {{ok:boolean, reason:null|'phase'|'energy'|'slot'|'markers'}}
 */
export function canPlayCard(state, side, card, slotIdx) {
  assertSide(side, 'canPlayCard')
  if (!card) return no('slot')
  // S3：phase 每侧化 —— 「轮到我」且「我在出牌阶段」。对 side='player' 与旧的顶层
  // `state.phase !== 'main'` 逐字等价（旧的 'main' 本就只在玩家回合存在）。
  // 对 side='enemy' 这句**今天还没有调用方** —— S4 才把 AI 接过来（顺序铁律：
  // S3 只负责把敌方的 phase 真正驱动起来，S4/S5 才对它设卡）。
  if (state.activeSide !== side || state[side].phase !== 'main') return no('phase')
  if (card.cost > state[side].energy) return no('energy')
  if (slotIdx < 0 || slotIdx >= MAX_FIELD_SLOTS) return no('slot')
  // 阵营标记的真相源是**弃牌堆**（打出的卡进弃牌堆 → 累积标记）
  if (card.factionRequirement && !canPlayWithMarkers(card, state[side].discard)) return no('markers')
  return OK
}

/**
 * 这张卡能不能发起攻击（不含目标合法性 —— 那是 canTargetSlot）。
 *
 * 返回 **canCardAttack 的原始 gate 形状**，故意不吞掉 reason：外壳要靠 reason 在
 * sleep 与 fatigue 之间插入 confused 的重定向分支（见文件头的顺序说明）。
 *
 * @param {Object} state
 * @param {'player'|'enemy'} side - 攻击方
 * @param {number} atkSlot
 * @param {{summonedThisTurn:Set|Array, attackedThisTurn:Set|Array}} marks
 *        —— S1 阶段 marks 仍是 useBattle 里的两个 Set（useRef），故以参数注入。
 *        S2 会把它们收进 reducer state，届时本参数消失、签名塌成 (state, side, atkSlot)，
 *        每个 gate 都变成「单个 JSON-clean 值的纯函数」—— 那才是镜像测试成立的前提。
 * @returns {{ok:boolean, reason:null|'phase'|'empty'|'sleep'|'fatigue'|'attacked'}}
 */
export function canAttackFrom(state, side, atkSlot, marks) {
  assertSide(side, 'canAttackFrom')
  // S3：同 canPlayCard —— 「轮到我」且「我在战斗阶段」
  if (state.activeSide !== side || state[side].phase !== 'battle') return no('phase')
  const atkCard = state[side].field[atkSlot]
  if (!atkCard || atkCard.currentHp <= 0) return no('empty')
  const gate = canCardAttack(atkCard, {
    summonedThisTurn: marks?.summonedThisTurn,
    attackedThisTurn: marks?.attackedThisTurn,
  })
  return gate.ok ? OK : no(gate.reason)
}

/**
 * 这个目标能不能打（守护规则）。defSlot === -1 表示直攻主人。
 *
 * 复刻 useBattle.attack 的**两处**守护检查 —— 它们条件不同，别合并：
 *   · 直攻主人（:1821）：hasGuard(对面场) && !attackerBypassesGuard(atkCard, null)
 *   · 打卡（:1863）  ：hasGuard(对面场) && !isGuardCard(defCard) && !attackerBypassesGuard(atkCard, defCard)
 *   打卡那条多一个 `!isGuardCard(defCard)` —— 守护卡自己**永远可以**被打（否则有守护卡时
 *   谁都打不了）。直攻主人那条给 attackerBypassesGuard 传 null 作为 defender。
 *
 * 「守护优先」是 CLAUDE.md 速查里的核心规则，而 aiAttack 从第一天起就在无视它
 * （对应位置一行都没有）—— 这个函数为两侧服务，就是在还那笔债。
 *
 * @returns {{ok:boolean, reason:null|'empty'|'guard'}}
 */
export function canTargetSlot(state, side, atkCard, defSlot) {
  assertSide(side, 'canTargetSlot')
  const defField = state[opp(side)].field

  if (defSlot === -1) {
    if (fieldHasGuard(defField) && !attackerBypassesGuard(atkCard, null)) return no('guard')
    return OK
  }

  const defCard = defField[defSlot]
  if (!defCard || defCard.currentHp <= 0) return no('empty')
  if (fieldHasGuard(defField) && !cardHasGuard(defCard) && !attackerBypassesGuard(atkCard, defCard)) return no('guard')
  return OK
}
