// 伤害计算 — Sprint 3 阵营克制 + 技能框架
// 攻击卡牌：双方互扣 ATK（含克制加成）
// 直攻主人：ATK 直接扣主人 HP（主人不反击）

import { FACTION_ADVANTAGE, FACTION_ADVANTAGE_BONUS, AWAKEN_FULL, AWAKEN_PARTIAL } from '../data/deckRules.js'

/**
 * 计算觉醒加成后的实际 ATK
 *
 * 倍率读 deckRules 而非硬编码：这两个常量此前是**第二个没人读的真相源**
 * （deckRules 声明 AWAKEN_FULL=2.0 / AWAKEN_PARTIAL=1.3，本文件却各自硬编码
 * 一份字面量，全项目对这两个常量零引用）—— 与 MAX_FIELD_SLOTS 栽过的
 * 「会撒谎的 import」是同一个坑。同值接线，零行为变化。
 *
 * ⚠️ partialAwaken 这一档引擎从不产生（answerQuiz 是二元判定，题库也没有
 *    「哪些选项算接近」的标注）。这里保留能力、不删 —— 但别据此以为游戏里
 *    真打得出 ×1.3。详见 deckRules.js 的 AWAKEN_PARTIAL 注释。
 *
 * @param {number} atk - 原始 ATK
 * @param {Object} opts - { awakened, partialAwaken }
 */
export function getEffectiveAtk(atk, opts = {}) {
  if (opts.awakened) return Math.round(atk * AWAKEN_FULL)
  if (opts.partialAwaken) return Math.round(atk * AWAKEN_PARTIAL)
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

// 卡面写「免疫科技系伤害」的技能名 —— 统一在此登记（单一真相源）。
// ⚠️ 历史坑（2026-07 真机压测揪出）：isImmune 原本只认 Drug Immunity →
//    MRSA(Antibiotic Resistance) 与 生物膜(Biofilm Shield) 的免疫从没生效。
//    这两张的「反弹/守护/日志」那半有实现，造成「看着免疫、照样被科技系打满血」的假象。
const TECH_IMMUNE_SKILLS = new Set(['Drug Immunity', 'Antibiotic Resistance', 'Biofilm Shield'])

/**
 * 检查卡牌是否免疫该次攻击
 * - immune: 完全免疫所有伤害
 * - immune_tech: 免疫科技系伤害（状态）
 * - TECH_IMMUNE_SKILLS 里的技能: 被科技系攻击时免疫伤害
 */
function isImmune(defender, attacker) {
  const statuses = defender.statuses || [] // 不因缺 statuses 数组而漏掉下方技能判定
  if (statuses.some(s => s.type === 'immune')) return true
  if (statuses.some(s => s.type === 'immune_tech') && attacker?.faction === 'tech') return true
  if (attacker?.faction === 'tech' && defender.skills?.some(s => TECH_IMMUNE_SKILLS.has(s.nameEn))) return true
  return false
}

/**
 * 检查卡牌是否有群体免疫（Herd Immunity）— 致死伤害保留 1 HP
 * 调用方: useBattle 在扣血前检查
 * @returns {boolean} true 如果应该消耗一次 herd_immunity
 */
export function checkHerdImmunity(card, incomingDamage) {
  if (!card?.statuses) return false
  const hi = card.statuses.find(s => s.type === 'herd_immunity' && s.uses > 0)
  if (!hi) return false
  return card.currentHp - incomingDamage <= 0
}

/**
 * 攻击卡牌：双方互扣（含阵营克制 + 免疫检查 + 光环检查）
 * @param {Object} opts - { awakened, partialAwaken, attackerField, defenderField }
 *   attackerField / defenderField 用于 Sprint 23 Phase 3 光环检查
 * 返回 { atkDmg, defDmg, atkFactionBonus, defFactionBonus, defImmune, markBonus, auraEffects }
 */
export function calcCardBattle(attacker, defender, opts = {}) {
  // 防守方免疫检查
  if (isImmune(defender, attacker)) {
    const rawDefDmg = isImmune(attacker, defender) ? 0 : defender.atk
    const defResult = applyFactionAdvantage(defender, attacker, rawDefDmg)
    return {
      atkDmg: 0,
      defDmg: defResult.dmg,
      atkFactionBonus: false,
      defFactionBonus: defResult.factionBonus,
      defImmune: true,
    }
  }

  // 光环效果（Sprint 23 Phase 3）— attackerField/defenderField 可选
  const aura = (opts.attackerField || opts.defenderField)
    ? calcAuraEffects(attacker, defender, opts.attackerField || [], opts.defenderField || [])
    : { atkModifier: 0, dmgReduction: 0 }

  // 攻击方 ATK = 基础 + 觉醒 + 光环修饰
  const effectiveAtk = Math.max(0, getEffectiveAtk(attacker.atk, opts) + aura.atkModifier)
  const rawDefDmg = defender.atk // 反击不受觉醒加成

  // 阵营克制加成
  const atkResult = applyFactionAdvantage(attacker, defender, effectiveAtk)
  const defResult = applyFactionAdvantage(defender, attacker, rawDefDmg)

  // 光环减伤（防守方光环生效）
  let auraReducedAtk = atkResult.dmg
  if (aura.dmgReduction > 0) {
    auraReducedAtk = Math.floor(auraReducedAtk * (1 - aura.dmgReduction))
  }

  // 标记加伤（Sprint 23 Phase 2）
  let markBonus = 0
  const markStatus = defender.statuses?.find(s => s.type === 'marked')
  if (markStatus) {
    if (markStatus.bonus_from === 'all') {
      markBonus = Math.floor(auraReducedAtk * (markStatus.bonus_damage || 0))
    } else if (markStatus.bonus_from === 'faction') {
      if (attacker.faction === markStatus.faction_filter) {
        markBonus = markStatus.bonus_damage || 0
      }
    }
  }

  return {
    atkDmg: auraReducedAtk + markBonus,
    defDmg: defResult.dmg,
    atkFactionBonus: atkResult.factionBonus,
    defFactionBonus: defResult.factionBonus,
    defImmune: false,
    markBonus: markBonus > 0,
    auraApplied: aura.atkModifier !== 0 || aura.dmgReduction > 0,
  }
}

/**
 * 光环效果检查（Sprint 23 Phase 3）
 * 检查对方场上是否有持续光环卡，返回 { atkModifier, dmgReduction }
 * @param {Object} attacker - 攻击方卡牌
 * @param {Object} defender - 防守方卡牌
 * @param {Array} attackerAllyField - 攻击方友方场（用于检查 Antibacterial Aura 等己方光环）
 * @param {Array} defenderAllyField - 防守方友方场（用于检查防守方光环卡）
 */
export function calcAuraEffects(attacker, defender, attackerAllyField = [], defenderAllyField = []) {
  let atkModifier = 0
  let dmgReduction = 0

  // 检查防守方友方场上的光环卡
  for (const card of defenderAllyField) {
    if (!card || card.currentHp <= 0 || !card.skills) continue
    for (const skill of card.skills) {
      // Antibacterial Aura: 己方全体受到病原系伤害 -30%
      if (skill.nameEn === 'Antibacterial Aura' && attacker?.faction === 'pathogen') {
        dmgReduction = Math.max(dmgReduction, 0.3)
      }
    }
  }

  // 检查攻击方友方场上的光环卡（影响敌方属性）
  for (const card of attackerAllyField) {
    if (!card || card.currentHp <= 0 || !card.skills) continue
    for (const skill of card.skills) {
      // Droplet Filter: 敌方病原系 ATK -500
      if (skill.nameEn === 'Droplet Filter' && defender?.faction === 'pathogen') {
        atkModifier -= 500
      }
      // Immune Collapse: 敌方人体系 ATK/HP -20% (对 ATK 生效)
      if (skill.nameEn === 'Immune Collapse' && defender?.faction === 'body') {
        atkModifier -= Math.floor(defender.atk * 0.2)
      }
    }
  }

  return { atkModifier, dmgReduction }
}

/**
 * 直攻主人（damageMultiplier 供 Rush 等技能使用）
 */
export function calcLeaderDamage(attacker, opts = {}) {
  const base = getEffectiveAtk(attacker.atk, opts)
  const multiplier = opts.damageMultiplier || 1
  return Math.floor(base * multiplier)
}
