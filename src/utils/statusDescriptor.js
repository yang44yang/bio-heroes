// 统一描述战斗 status 的人话化模块。
// CardDetailModal 的"当前状态"区 + Card.jsx 战斗小卡角标都从这里读，避免两处重写不一致。
//
// status 形态(来自 useBattle.js & engine)：
//   { type:'shield', amount, source }
//   { type:'poison', damage, turnsLeft }
//   { type:'sleep',  turnsLeft }
//   { type:'atk_boost', amount, turnsLeft, source }   ← amount 可正可负
//   { type:'immune_tech', turnsLeft }                  ← 99 = 几乎永久(boss 阶段触发)
//   { type:'swift_boost', turnsLeft }
//   { type:'herd_immunity', uses }
//   { type:'event_debuff', event, stat, amount, turnsLeft }

// 持续回合的人话化(turnsLeft 99 当永久；turnsLeft 缺省也当永久)
function turnText(turnsLeft) {
  if (turnsLeft == null) return null
  if (turnsLeft >= 99) return '永久'
  return `剩 ${turnsLeft} 回合`
}

// 一个 status → 详情区单行描述：{ emoji, label, detail, color, kind }
//   kind: 'buff' (绿) | 'debuff' (橙) | 'neutral' (灰)
export function describeStatus(s) {
  if (!s || !s.type) return null
  const t = turnText(s.turnsLeft)
  switch (s.type) {
    case 'shield':
      return { emoji: '🛡️', label: '护盾', detail: `${s.amount} 点伤害吸收`, kind: 'buff' }
    case 'poison':
      return { emoji: '☠️', label: '中毒', detail: `每回合 -${s.damage} HP${t ? '（' + t + '）' : ''}`, kind: 'debuff' }
    case 'sleep':
      return { emoji: '💤', label: '沉睡', detail: `无法行动${t ? '（' + t + '）' : ''}`, kind: 'debuff' }
    case 'atk_boost':
      if ((s.amount || 0) >= 0) {
        return { emoji: '💪', label: 'ATK 增益', detail: `+${s.amount}${t ? '（' + t + '）' : ''}${s.source ? '【来自 ' + s.source + '】' : ''}`, kind: 'buff' }
      }
      return { emoji: '⬇️', label: 'ATK 减益', detail: `${s.amount}${t ? '（' + t + '）' : ''}${s.source ? '【来自 ' + s.source + '】' : ''}`, kind: 'debuff' }
    case 'immune_tech':
      return { emoji: '🛡️', label: '免疫科技伤害', detail: t || '永久', kind: 'buff' }
    case 'swift_boost':
      return { emoji: '⚡', label: '迅击', detail: `出场即可攻击${t ? '（' + t + '）' : ''}`, kind: 'buff' }
    case 'herd_immunity':
      return { emoji: '🩹', label: '群体免疫', detail: `可抵消 ${s.uses || 1} 次致死伤害`, kind: 'buff' }
    case 'event_debuff':
      return { emoji: '⚠️', label: '环境减益', detail: `${s.event || ''} ${s.stat || 'ATK'} ${s.amount > 0 ? '-' : ''}${s.amount}${t ? '（' + t + '）' : ''}`, kind: 'debuff' }
    default:
      return { emoji: '✨', label: s.type, detail: t || '', kind: 'neutral' }
  }
}

// 战斗小卡角标用的精简形式：{ emoji, badge, color }
// 只挑视觉信息密度高的(数值/状态)，不影响小卡布局
export function smallBadgesFor(statuses) {
  if (!Array.isArray(statuses)) return []
  const badges = []
  // ATK buff/debuff 汇总
  const atkSum = statuses.filter(s => s.type === 'atk_boost').reduce((sum, s) => sum + (s.amount || 0), 0)
  if (atkSum > 0) badges.push({ key: 'atk+', text: `💪+${atkSum}`, cls: 'bg-yellow-900/90 text-yellow-200' })
  else if (atkSum < 0) badges.push({ key: 'atk-', text: `⬇${atkSum}`, cls: 'bg-orange-900/90 text-orange-200' })
  // 免疫科技伤害
  if (statuses.some(s => s.type === 'immune_tech')) badges.push({ key: 'imm', text: '🛡️免科技', cls: 'bg-purple-900/90 text-purple-200' })
  // 迅击
  if (statuses.some(s => s.type === 'swift_boost')) badges.push({ key: 'swft', text: '⚡迅击', cls: 'bg-cyan-900/90 text-cyan-200' })
  // 群体免疫
  if (statuses.some(s => s.type === 'herd_immunity')) badges.push({ key: 'herd', text: '🩹群免', cls: 'bg-pink-900/90 text-pink-200' })
  // 环境减益(显示一个汇总，不展开)
  if (statuses.some(s => s.type === 'event_debuff')) badges.push({ key: 'env', text: '⚠️环境', cls: 'bg-orange-900/90 text-orange-200' })
  return badges
}
