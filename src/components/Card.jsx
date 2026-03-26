import React, { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { FACTIONS, RARITIES } from '../data/deckRules'

const rarityColors = {
  R: 'from-blue-600 to-blue-800',
  SR: 'from-purple-500 to-purple-800',
  SSR: 'from-yellow-400 to-amber-600',
}

const rarityBorder = {
  R: 'border-blue-400',
  SR: 'border-purple-400',
  SSR: 'border-yellow-400',
}

const rarityGlow = {
  R: '',
  SR: 'shadow-md shadow-purple-500/20',
  SSR: 'shadow-lg shadow-yellow-400/30',
}

// Event card styles
const eventBg = 'from-emerald-700 to-teal-900'
const eventBorder = 'border-emerald-400'

// SP card styles
const spBg = 'from-amber-500 via-yellow-400 to-orange-500'
const spBorder = 'border-yellow-300'

const BattleCard = forwardRef(({ card, hp, maxHp, isPlayer, isActive, onClick }, ref) => {
  if (!card) return null

  const isEvent = card.type === 'event'
  const isSp = card.type === 'sp'
  const hpPercent = Math.max(0, (hp / maxHp) * 100)
  const hpColor = hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'
  const isDead = hp <= 0
  const faction = FACTIONS[card.faction]

  const bgClass = isSp ? spBg : isEvent ? eventBg : rarityColors[card.rarity]
  const borderClass = isSp ? spBorder : isEvent ? eventBorder : rarityBorder[card.rarity]
  const glowClass = isSp ? 'shadow-lg shadow-yellow-500/30' : isEvent ? '' : rarityGlow[card.rarity]

  // Status effects detection
  const statuses = card.statuses || []
  const isPoisoned = statuses.some(s => s.type === 'poison')
  const isSleeping = statuses.some(s => s.type === 'sleep')
  const hasShield = statuses.some(s => s.type === 'shield')
  const shieldAmount = statuses.filter(s => s.type === 'shield').reduce((sum, s) => sum + (s.amount || 0), 0)

  return (
    <div
      ref={ref}
      className={`
        relative w-full h-full rounded-lg sm:rounded-xl border-2 p-1 sm:p-2 select-none
        ${borderClass} ${glowClass}
        ${isDead ? 'opacity-30 grayscale' : ''}
        ${isActive && !isDead ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-900' : ''}
        ${!isDead && onClick ? 'cursor-pointer hover:scale-105' : ''}
        bg-gradient-to-b ${bgClass}
      `}
      onClick={() => !isDead && onClick?.(card)}
    >
      {/* SSR 金色脉动边框 */}
      {card.rarity === 'SSR' && !isEvent && !isDead && (
        <motion.div
          className="absolute inset-0 rounded-xl border-2 border-yellow-400/60 pointer-events-none"
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* SP 卡光晕 */}
      {isSp && !isDead && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ boxShadow: '0 0 12px rgba(255,215,0,0.4), inset 0 0 8px rgba(255,215,0,0.1)' }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      {/* 状态效果：中毒绿光 */}
      {isPoisoned && !isDead && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ boxShadow: 'inset 0 0 10px rgba(34,197,94,0.4)' }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}

      {/* 状态效果：护盾蓝罩 */}
      {hasShield && !isDead && (
        <motion.div
          className="absolute inset-0 rounded-xl border border-blue-400/50 pointer-events-none"
          style={{ boxShadow: '0 0 8px rgba(96,165,250,0.3), inset 0 0 6px rgba(96,165,250,0.15)' }}
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      {/* 状态效果：沉睡 Zzz */}
      {isSleeping && !isDead && (
        <motion.div
          className="absolute -top-1 -right-1 text-sm pointer-events-none z-10"
          animate={{ y: [-2, -6, -2], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          💤
        </motion.div>
      )}

      {/* 中毒标记 */}
      {isPoisoned && !isDead && (
        <div className="absolute top-0 left-0 text-[10px] bg-green-900/80 text-green-400 px-1 rounded-br z-10">
          ☠️
        </div>
      )}

      {/* 护盾数值 */}
      {hasShield && !isDead && (
        <div className="absolute top-0 left-0 text-[10px] bg-blue-900/80 text-blue-300 px-1 rounded-br z-10">
          🛡️{shieldAmount}
        </div>
      )}

      {/* 费用（左上） */}
      <div className={`absolute -top-1.5 -left-1.5 sm:-top-2 sm:-left-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full border flex items-center justify-center text-[10px] sm:text-xs font-black text-white shadow z-20
        ${isSp ? 'bg-amber-500 border-amber-300' : isEvent ? 'bg-emerald-500 border-emerald-300' : 'bg-blue-500 border-blue-300'}
      `}>
        {isSp ? card.spCost : card.cost}
      </div>

      {/* 稀有度（右上） */}
      <div className={`absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 text-[9px] sm:text-xs font-bold px-1 sm:px-1.5 py-0.5 rounded z-20
        ${card.rarity === 'SSR' ? 'bg-yellow-500/80 text-black' : 'bg-black/60 text-white'}
      `}>
        {isSp ? 'SP' : card.rarity}
      </div>

      {/* 类型标签（事件卡） */}
      {isEvent && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-600 text-white z-20">
          事件
        </div>
      )}

      {/* 阵营标记 */}
      <div className="text-center text-sm sm:text-lg leading-none mt-0.5 sm:mt-1">{faction?.icon}</div>

      {/* 名称 */}
      <div className="text-center text-[9px] sm:text-xs font-bold text-white truncate mt-0.5 sm:mt-1">{card.name}</div>

      {/* 阵营名 */}
      <div className="text-center text-[8px] sm:text-[10px] text-white/50 hidden sm:block">{faction?.name}</div>

      {isEvent ? (
        <div className="mt-1 mb-0.5 sm:mt-1.5 sm:mb-1 text-[7px] sm:text-[9px] text-emerald-200 text-center leading-tight px-0.5 sm:px-1 min-h-[16px] sm:min-h-[24px]">
          {card.effectDescription}
        </div>
      ) : (
        <>
          <div className="relative h-2 sm:h-3 bg-gray-800 rounded-full overflow-hidden mt-1 mb-0.5 sm:mt-1.5 sm:mb-1">
            <motion.div
              className={`absolute inset-y-0 left-0 ${hpColor} rounded-full`}
              initial={false}
              animate={{ width: `${hpPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-[8px] sm:text-[10px] font-bold text-white drop-shadow">
              {hp}/{maxHp}
            </div>
          </div>

          <div className="flex items-center justify-between text-[8px] sm:text-[10px] text-white/80">
            <span>⚔️{card.atk}</span>
            {card.skills?.length > 0 && (
              <span className="text-yellow-300 truncate max-w-[40px] sm:max-w-[60px]" title={card.skills.map(s => s.name).join(', ')}>
                {card.skills[0].name}
              </span>
            )}
          </div>
        </>
      )}

      {/* SP召唤标记 */}
      {isEvent && card.spSummonRule && (
        <div className="text-center text-[9px] text-yellow-300 mt-0.5">
          🌟 可触发SP
        </div>
      )}
    </div>
  )
})

BattleCard.displayName = 'BattleCard'
export default BattleCard
