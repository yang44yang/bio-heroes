// 纯战斗结算 — 无 React、无副作用，可被 .mjs 直接 import 单测。
//
// 这是把 useBattle.js 的战斗逻辑「绞杀式」剥离到可测引擎的第一块（2026-07-02）。
// 只负责「算数字」：卡打卡的互扣伤害、护盾吸收后的实际伤害、阵营克制/免疫/光环标志。
//
// ⚠️ 刻意留在调用方（useBattle 的 setState 闭包）里、不搬进来的两件事：
//   1. 击杀判定 —— 现有实现读的是 setState 的 prev（最新 state），可能已被本次攻击前的
//      applySkillEvents 改过；搬进纯函数会改变时序语义。故 defKilled/atkKilled 仍由调用方
//      基于 next[slot].currentHp 判定。
//   2. 护盾状态扣减 —— applyShieldAbsorb 会 mutate 卡上的 shield 状态，属于「落地」副作用，
//      仍在 setState 闭包里对最新 state 执行。本函数只返回吸收/实际伤害的「数值」。
// 因此本函数是行为保真的抽取：数值与原内联逐行等价。

import { calcCardBattle } from '../utils/damage.js'

/**
 * 结算一次「卡打卡」的伤害数值（纯函数）。
 *
 * @param {Object}   p
 * @param {Object}   p.attacker        攻击方卡牌（需 atk / currentHp / faction / statuses）
 * @param {Object}   p.defender        防守方卡牌
 * @param {Object}   [p.awakenOpts={}] 觉醒选项 { awakened, partialAwaken }（AI 攻击不传→无觉醒）
 * @param {Array}    [p.attackerField] 攻击方友方场（光环检查用，可选）
 * @param {Array}    [p.defenderField] 防守方友方场（光环检查用，可选）
 * @returns {{
 *   atkDmg:number, defDmg:number,                  // calcCardBattle 原始互扣伤害（含觉醒/克制/光环/标记）
 *   defActualDmg:number, atkActualDmg:number,       // 扣护盾后实际扣血值
 *   defShieldAbsorbed:number, atkShieldAbsorbed:number,
 *   defImmune:boolean, atkFactionBonus:boolean, defFactionBonus:boolean,
 *   auraApplied:boolean, markBonus:boolean,
 * }}
 */
export function resolveCardCombat({ attacker, defender, awakenOpts = {}, attackerField, defenderField }) {
  const battle = calcCardBattle(attacker, defender, {
    ...awakenOpts,
    attackerField,
    defenderField,
  })
  const { atkDmg, defDmg } = battle

  const defShield = defender.statuses?.find((s) => s.type === 'shield')
  const defShieldAbsorbed = defShield ? Math.min(defShield.amount, atkDmg) : 0
  const defActualDmg = defShield ? Math.max(0, atkDmg - defShield.amount) : atkDmg

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
  }
}
