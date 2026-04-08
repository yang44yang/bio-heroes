/**
 * 状态效果系统 — 中毒 / 护盾 / 沉睡
 * Bio Heroes 生物英雄传 — Sprint 3
 *
 * 每张场上卡牌可以有 statuses[] 数组
 * 每回合结束时调用 processStatuses 处理一次
 */

/**
 * 处理一张卡的所有状态效果（每回合结束调用）
 * @param {Object} card - 场上卡牌（会直接修改 hp / statuses）
 * @returns {Array} 事件列表（供日志 / 动画使用）
 */
export function processStatuses(card) {
  if (!card || !card.statuses || card.statuses.length === 0) return []

  const events = []
  const remaining = []

  for (const status of card.statuses) {
    switch (status.type) {
      case 'poison': {
        card.currentHp -= status.damage
        events.push({
          type: 'POISON_TICK',
          target: card.name,
          damage: status.damage,
          message: `🟢 ${card.name} 中毒！损失 ${status.damage} HP`,
        })
        if (status.turnsLeft > 1) {
          remaining.push({ ...status, turnsLeft: status.turnsLeft - 1 })
        }
        break
      }

      case 'shield':
        // 护盾不按回合消耗，被攻击时消耗
        remaining.push(status)
        break

      case 'sleep': {
        if (status.turnsLeft > 1) {
          remaining.push({ ...status, turnsLeft: status.turnsLeft - 1 })
          events.push({
            type: 'SLEEP_TICK',
            target: card.name,
            message: `😴 ${card.name} 还在沉睡中...（剩余${status.turnsLeft - 1}回合）`,
          })
        } else {
          events.push({
            type: 'SLEEP_CLEAR',
            target: card.name,
            message: `⏰ ${card.name} 醒来了！`,
          })
        }
        break
      }

      case 'immune': {
        if (status.turnsLeft > 1) {
          remaining.push({ ...status, turnsLeft: status.turnsLeft - 1 })
        } else {
          events.push({
            type: 'IMMUNE_CLEAR',
            target: card.name,
            message: `🛡️ ${card.name} 的免疫状态结束了`,
          })
        }
        break
      }

      case 'immune_tech': {
        // 科技免疫通常持续到战斗结束（turnsLeft=99），但仍支持回合递减
        if (status.turnsLeft > 1) {
          remaining.push({ ...status, turnsLeft: status.turnsLeft - 1 })
        } else {
          events.push({
            type: 'IMMUNE_TECH_CLEAR',
            target: card.name,
            message: `⚗️ ${card.name} 不再免疫科技系伤害`,
          })
        }
        break
      }

      case 'stealth': {
        // 隐身：按回合递减，到期后消失
        if (status.turnsLeft > 1) {
          remaining.push({ ...status, turnsLeft: status.turnsLeft - 1 })
        } else {
          events.push({
            type: 'STEALTH_CLEAR',
            target: card.name,
            message: `🌫️ ${card.name} 的隐身消失了`,
          })
        }
        break
      }

      case 'deep_pressure': {
        // 深海压力：持续存在，不递减（turnsLeft=99）
        remaining.push(status)
        break
      }

      default:
        remaining.push(status) // 未知状态保留
    }
  }

  card.statuses = remaining
  return events
}

/**
 * 护盾伤害吸收（在伤害计算后、扣 HP 前调用）
 * @param {Object} card - 受伤的卡牌
 * @param {number} incomingDamage - 原始伤害
 * @returns {number} 实际伤害（扣除护盾后）
 */
export function applyShieldAbsorb(card, incomingDamage) {
  if (!card.statuses) return incomingDamage
  const shieldIdx = card.statuses.findIndex(s => s.type === 'shield')
  if (shieldIdx === -1) return incomingDamage

  const shield = card.statuses[shieldIdx]
  if (shield.amount >= incomingDamage) {
    shield.amount -= incomingDamage
    return 0 // 完全吸收
  } else {
    const remaining = incomingDamage - shield.amount
    card.statuses.splice(shieldIdx, 1) // 护盾打碎
    return remaining
  }
}
