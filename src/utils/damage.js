// 伤害计算 — Sprint 3 阵营克制 + 技能框架
// 攻击卡牌：双方互扣 ATK（含克制加成）
// 直攻主人：ATK 直接扣主人 HP（主人不反击）

import { FACTION_ADVANTAGE, FACTION_ADVANTAGE_BONUS } from '../data/deckRules'

/**
 * 计算觉醒加成后的实际 ATK
 * @param {number} atk - 原始 ATK
 * @param {Object} opts - { awakened, partialAwaken }
 */
export function getEffectiveAtk(atk, opts = {}) {
  if (opts.awakened) return Math.round(atk * 2.0)
  if (opts.partialAwaken) return Math.round(atk * 1.3)
  return atk
}

/**
 * 阵营克制伤害加成
 * @param {Object} attacker - 攻击方（需要有 faction 字段）
 * @param {Object} defender - 防守方（需要有 faction 字段）
 * @param {number} baseDmg - 基础伤害
 * @returns {{ dmg: number, factionBonus: boolean }}
 */
export function applyFactionAdvantage(attacker, defender, baseDmg) {
  if (!attacker?.faction || !defender?.faction) return { dmg: baseDmg, factionBonus: false }

  const advantage = FACTION_ADVANTAGE[attacker.faction]
  if (advantage && advantage.strong === defender.faction) {
    return {
      dmg: Math.floor(baseDmg * (1 + FACTION_ADVANTAGE_BONUS)),
      factionBonus: true,
    }
  }
  return { dmg: baseDmg, factionBonus: false }
}

/**
 * 攻击卡牌：双方互扣（含阵营克制）
 * 返回 { atkDmg, defDmg, atkFactionBonus, defFactionBonus }
 */
export function calcCardBattle(attacker, defender, opts = {}) {
  const rawAtkDmg = getEffectiveAtk(attacker.atk, opts)
  const rawDefDmg = defender.atk // 反击不受觉醒加成

  // 阵营克制加成（双方各自判定）
  const atkResult = applyFactionAdvantage(attacker, defender, rawAtkDmg)
  const defResult = applyFactionAdvantage(defender, attacker, rawDefDmg)

  return {
    atkDmg: atkResult.dmg,
    defDmg: defResult.dmg,
    atkFactionBonus: atkResult.factionBonus,
    defFactionBonus: defResult.factionBonus,
  }
}

/**
 * 直攻主人（damageMultiplier 供 Rush 等技能使用）
 */
export function calcLeaderDamage(attacker, opts = {}) {
  const base = getEffectiveAtk(attacker.atk, opts)
  const multiplier = opts.damageMultiplier || 1
  return Math.floor(base * multiplier)
}
