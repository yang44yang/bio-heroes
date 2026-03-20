/**
 * 技能触发时机定义 & 统一触发函数
 * Bio Heroes 生物英雄传 — Sprint 3
 *
 * 6 个触发时机，战斗状态机在对应阶段调用 triggerSkills(timing, context)
 */

import { skillRegistry } from './skillRegistry'

export const SKILL_TIMINGS = {
  ON_PLAY:       'onPlay',       // 卡牌从手牌放到战场时
  ON_ATTACK:     'onAttack',     // 该卡发起攻击时（伤害计算前）
  ON_HIT:        'onHit',        // 该卡被攻击时（伤害计算前）
  ON_KILL:       'onKill',       // 该卡击杀对方卡牌后
  ON_DEATH:      'onDeath',      // 该卡被击杀时
  ON_TURN_START: 'onTurnStart',  // 回合开始时
  ON_TURN_END:   'onTurnEnd',    // 回合结束时
}

/**
 * 触发指定时机的所有技能
 * @param {string} timing - 触发时机
 * @param {Object} context - 战斗上下文（由调用方按需提供）
 * @returns {Array} 技能效果事件列表（供动画 / 日志 / 伤害浮字使用）
 */
export function triggerSkills(timing, context) {
  const events = []

  // 确定要检查哪些卡
  let cardsToCheck = []

  switch (timing) {
    case 'onPlay':
      cardsToCheck = [context.card]
      break
    case 'onAttack':
      cardsToCheck = [context.attacker]
      break
    case 'onHit':
      cardsToCheck = [context.defender]
      break
    case 'onKill':
      cardsToCheck = [context.attacker]
      break
    case 'onDeath':
      cardsToCheck = [context.card]
      break
    case 'onTurnStart':
    case 'onTurnEnd':
      cardsToCheck = (context.friendlyField || []).filter(Boolean)
      break
    default:
      return events
  }

  for (const card of cardsToCheck) {
    if (!card || !card.skills) continue
    for (const skill of card.skills) {
      const handler = skillRegistry[skill.nameEn]
      if (!handler || handler.timing !== timing || !handler.execute) continue
      try {
        const result = handler.execute({ ...context, card })
        if (result) {
          const arr = Array.isArray(result) ? result : [result]
          events.push(...arr)
        }
      } catch (err) {
        console.warn(`[skillTrigger] ${skill.nameEn} execute error:`, err)
      }
    }
  }

  return events
}
