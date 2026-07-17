// 纯战斗结算 — 无 React、无副作用，可被 .mjs 直接 import 单测。
//
// 这是把 useBattle.js 的战斗逻辑「绞杀式」剥离到可测引擎的第一块（2026-07-02）。
// 只负责「算数字」：卡打卡的互扣伤害、技能战斗修饰符、护盾吸收后的实际伤害。
//
// ⚠️ 刻意留在调用方（useBattle 的 setState 闭包）里、不搬进来的两件事：
//   1. 击杀判定 —— 现有实现读的是 setState 的 prev（最新 state），可能已被本次攻击前的
//      applySkillEvents 改过；搬进纯函数会改变时序语义。故 defKilled/atkKilled 仍由调用方
//      基于 next[slot].currentHp 判定。
//   2. 护盾状态扣减 —— applyShieldAbsorb 会 mutate 卡上的 shield 状态，属于「落地」副作用，
//      仍在 setState 闭包里对最新 state 执行。本函数只返回吸收/实际伤害的「数值」。
//
// 战斗修饰符（P0 修复，2026-07-02）：
//   onAttack/onHit 技能（克制加倍 / 无视护盾 / 闪避 / 减伤）过去靠 mutate ctx.<x> 传递，
//   但 triggerSkills 传给 handler 的是 {...context} 拷贝、改动被丢弃，且打卡结算从不读 →
//   十余张卡的招牌效果在「打卡」时静默失效。改法：生产端把修饰符放进它返回事件的 `mods`
//   字段，调用方用 aggregateCombatMods() 折叠后传进来，这里消费。直攻主人仍走既有的
//   RUSH_BOOST→flat×2 路径、与本函数无关，不双算。

import { calcCardBattle } from '../utils/damage.js'

/** 默认（无修饰符）—— 与修饰符出现前的行为完全一致 */
function normalizeMods(mods) {
  // 注：ignoreGuard 不在此 —— 守护是攻击结算前的门，由 guardSkill.attackerBypassesGuard 处理，不走 combat mods。
  return {
    damageMultiplier: mods && mods.damageMultiplier != null ? mods.damageMultiplier : 1,
    ignoreShield: Boolean(mods && mods.ignoreShield),
    dodged: Boolean(mods && mods.dodged),
    damageReduction: (mods && mods.damageReduction) || 0,
  }
}

/**
 * 把一批技能事件里的 `mods` 折叠成一个战斗修饰符对象（纯函数）。
 * 倍率相乘、减伤相加、布尔取或。没有 mods 字段的事件被忽略。
 * @param {Array} events - triggerSkills('onAttack'/'onHit') 收集到的事件
 */
export function aggregateCombatMods(events = []) {
  const mods = { damageMultiplier: 1, ignoreShield: false, dodged: false, damageReduction: 0 }
  for (const evt of events) {
    const m = evt && evt.mods
    if (!m) continue
    if (m.damageMultiplier != null) mods.damageMultiplier *= m.damageMultiplier
    if (m.ignoreShield) mods.ignoreShield = true
    if (m.dodged) mods.dodged = true
    if (m.damageReduction) mods.damageReduction += m.damageReduction
  }
  return mods
}

/**
 * 结算一次「卡打卡」的伤害数值（纯函数）。
 *
 * @param {Object}   p
 * @param {Object}   p.attacker        攻击方卡牌（需 atk / currentHp / faction / statuses）
 * @param {Object}   p.defender        防守方卡牌
 * @param {Object}   [p.awakenOpts={}] 觉醒选项 { awakened, partialAwaken }（AI 攻击不传→无觉醒）
 * @param {Array}    [p.attackerField] 攻击方友方场（光环检查用，可选）
 * @param {Array}    [p.defenderField] 防守方友方场（光环检查用，可选）
 * @param {Object}   [p.mods]          战斗修饰符（aggregateCombatMods 的产物），缺省=无修饰符
 * @returns {{
 *   atkDmg:number, defDmg:number,                  // 攻击方最终伤害(含修饰符) / 反击伤害
 *   defActualDmg:number, atkActualDmg:number,       // 扣护盾后实际扣血值
 *   defShieldAbsorbed:number, atkShieldAbsorbed:number,
 *   defImmune:boolean, atkFactionBonus:boolean, defFactionBonus:boolean,
 *   auraApplied:boolean, markBonus:boolean, appliedMods:Object,
 * }}
 */
export function resolveCardCombat({ attacker, defender, awakenOpts = {}, attackerField, defenderField, mods }) {
  const m = normalizeMods(mods)
  const battle = calcCardBattle(attacker, defender, { ...awakenOpts, attackerField, defenderField })
  const { defDmg } = battle

  // 攻击方伤害：基础(含觉醒/克制/光环/标记) → 叠技能修饰符
  let atkDmg = battle.atkDmg
  if (m.damageMultiplier !== 1) atkDmg = Math.floor(atkDmg * m.damageMultiplier) // 克制/首击 ×倍率
  if (m.damageReduction > 0) atkDmg = Math.max(0, atkDmg - m.damageReduction) // 防守方减伤
  if (m.dodged) atkDmg = 0 // 防守方闪避 → 完全躲开本次攻击

  // 护盾吸收（"无视护盾"时跳过：既不吸收也不消耗护盾）
  const defShield = m.ignoreShield ? null : defender.statuses?.find((s) => s.type === 'shield')
  const defShieldAbsorbed = defShield ? Math.min(defShield.amount, atkDmg) : 0
  const defActualDmg = defShield ? Math.max(0, atkDmg - defShield.amount) : atkDmg

  // 反击伤害（攻击方受）：不受上述攻/防修饰符影响，只走攻击方自己的护盾
  const atkShield = attacker.statuses?.find((s) => s.type === 'shield')
  const atkShieldAbsorbed = atkShield ? Math.min(atkShield.amount, defDmg) : 0
  const atkActualDmg = atkShield ? Math.max(0, defDmg - atkShield.amount) : defDmg

  return {
    atkDmg,
    defDmg,
    defActualDmg,
    atkActualDmg,
    defShieldAbsorbed,
    atkShieldAbsorbed,
    defImmune: Boolean(battle.defImmune),
    atkFactionBonus: Boolean(battle.atkFactionBonus),
    defFactionBonus: Boolean(battle.defFactionBonus),
    auraApplied: Boolean(battle.auraApplied),
    markBonus: Boolean(battle.markBonus),
    appliedMods: m,
  }
}

/**
 * 回合标记里有没有这个 uid。**同时吃 Set 与数组** —— 这不是为了灵活，是有两个真实调用方：
 *   · useBattle 走 battleReducer 的 state[side].summoned/.attacked，那里是**数组**
 *     （S2：Set 不过 JSON.stringify —— `JSON.stringify(new Set(['a'])) === '{}'` ——
 *      而棋盘状态要能整棵推给 PvP 的 guest）；
 *   · TutorialScreen.jsx:42-43 是**独立棋盘**（不走 useBattle），它自己那对 useState
 *     仍是 Set，且没有序列化需求 → 没理由为了统一去动教学关。
 * 两者共用本文件的 canCardAttack，所以判定必须对两种容器都成立。
 */
function marked(coll, uid) {
  if (!coll) return false
  return typeof coll.has === 'function' ? coll.has(uid) : coll.includes(uid)
}

/**
 * 判定一张卡能否发起攻击（纯函数，决策E2）。
 * 检查：sleep(沉睡) / fatigue(召唤疲劳，Swift Attack·Silent Dive·swift_boost 免疫) / attacked(本回合已攻击)。
 * ⚠️「混乱(confused)」不在此 —— 它是"攻击重定向到随机友方"、属副作用重定向而非阻断，由调用方(useBattle)处理。
 * 优先级 sleep > fatigue > attacked（reason 返回最高优先的那个）。rules.canAttackFrom 唯一调用。
 *
 * ⚠️ **checkAttacked 参数已删（S5 de-fork）。** 它存在的唯一理由是让 aiAttack 弃权
 *   （`checkAttacked:false`）—— 因为 AI 的「一卡一回合一次」不由引擎强制，而是靠
 *   useAITurn 那个 `for (atkSlot = 0..MAX_FIELD_SLOTS)` 循环的形状兜着，而那个循环
 *   正是 PvP 要删掉的代码。aiAttack 已删，两侧同走一条路 → 这个「允许某一侧不守规则」
 *   的开关不该再存在。**删掉它就是 de-fork 在一个签名里的表达。**
 *
 * @param {Object} card
 * @param {Object} opts
 * @param {Set|string[]} [opts.summonedThisTurn]  本回合召唤的 uid（Set 或数组，见 marked）
 * @param {Set|string[]} [opts.attackedThisTurn]  本回合已攻击的 uid（Set 或数组）
 * @returns {{ ok:boolean, reason:'sleep'|'fatigue'|'attacked'|null }}
 */
export function canCardAttack(card, { summonedThisTurn, attackedThisTurn } = {}) {
  if (card?.statuses?.some((s) => s.type === 'sleep')) return { ok: false, reason: 'sleep' }
  const hasSwift =
    card?.skills?.some((s) => s.nameEn === 'Swift Attack' || s.nameEn === 'Silent Dive') ||
    card?.statuses?.some((s) => s.type === 'swift_boost')
  if (marked(summonedThisTurn, card.uid) && !hasSwift) return { ok: false, reason: 'fatigue' }
  if (marked(attackedThisTurn, card.uid)) return { ok: false, reason: 'attacked' }
  return { ok: true, reason: null }
}
