import React, { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { FACTIONS, RARITIES, spEarliestSummonTurn } from '../data/deckRules'
import { useLanguage } from '../i18n/LanguageContext'
import { smallBadgesFor } from '../utils/statusDescriptor'
import { cardHasGuard } from '../utils/guardSkill'

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
  const { t, cardName, skillName, lang, localName } = useLanguage()
  if (!card) return null

  const isEvent = card.type === 'event'
  const isSp = card.type === 'sp'
  const hpPercent = Math.max(0, (hp / maxHp) * 100)
  const hpColor = hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'
  // 事件卡没有 HP 概念，永远不算"死亡"。否则展示场景(showcase/图鉴/卡组/抽卡)
  // 传 hp={card.hp || 0}=0 → 误判 isDead → 整张卡变灰。战斗里生物/SP 仍按 hp<=0 判死。
  const isDead = !isEvent && hp <= 0
  const faction = FACTIONS[card.faction]

  const bgClass = isSp ? spBg : isEvent ? eventBg : rarityColors[card.rarity]
  const borderClass = isSp ? spBorder : isEvent ? eventBorder : rarityBorder[card.rarity]
  const glowClass = isSp ? 'shadow-lg shadow-yellow-500/30' : isEvent ? '' : rarityGlow[card.rarity]

  // Status effects detection
  const statuses = card.statuses || []
  const isPoisoned = statuses.some(s => s.type === 'poison')
  const isSleeping = statuses.some(s => s.type === 'sleep')
  const isConfused = statuses.some(s => s.type === 'confused')
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

      {/* Sprint 26: 混乱状态（弓形虫心智操控） */}
      {isConfused && !isDead && (
        <motion.div
          className="absolute -top-1 -right-1 text-sm pointer-events-none z-10"
          animate={{ rotate: [-10, 10, -10], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          🧠
        </motion.div>
      )}

      {/* 守护卡视效：顶部正中漂浮 🛡️ + "守护中"小标签。
          位置避开左角 ☠️/🛡️ 角标和右角 💤/🧠 摆动图标，与 SSR 金色边框/SP 金光晕分层不冲突。
          识别 Guard / Shell Defense / Physical Barrier 三种 nameEn(走 utils/guardSkill)。 */}
      {!isEvent && !isDead && cardHasGuard(card) && (
        <motion.div
          className="absolute -top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 pointer-events-none z-10"
          animate={{ y: [-2, -5, -2] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="text-base sm:text-lg leading-none drop-shadow">🛡️</span>
          <span className="text-[7px] sm:text-[8px] font-bold bg-cyan-700 text-white px-1 rounded leading-tight whitespace-nowrap">
            守护中
          </span>
        </motion.div>
      )}

      {/* 中毒标记 */}
      {isPoisoned && !isDead && (
        <div className="absolute top-0 left-0 text-[10px] bg-green-900/80 text-green-400 px-1 rounded-br z-10">
          ☠️
        </div>
      )}

      {/* 护盾数值 — 移到顶部正中，避开左角 cost 徽章 / ☠️ 中毒角标的重叠（齐齐实测：护甲数值与左上角重叠） */}
      {hasShield && !isDead && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[10px] bg-blue-900/80 text-blue-300 px-1 rounded-b z-10">
          🛡️{shieldAmount}
        </div>
      )}

      {/* 额外 status 角标(atk_boost / immune_tech / swift_boost / herd_immunity / event_debuff)
          叠在卡牌底部不抢顶部空间。中毒/护盾/沉睡 已经在上方有专属角标，这里跳过它们。 */}
      {!isDead && !isEvent && (() => {
        const badges = smallBadgesFor(statuses)
        if (badges.length === 0) return null
        return (
          <div className="absolute bottom-0 left-0 right-0 flex flex-wrap gap-0.5 px-0.5 pb-0.5 z-10 pointer-events-none">
            {badges.map(b => (
              <span key={b.key} className={`text-[8px] sm:text-[9px] leading-tight px-1 rounded ${b.cls}`}>
                {b.text}
              </span>
            ))}
          </div>
        )
      })()}

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
          {t('card.event')}
        </div>
      )}

      {/* 阵营标记 —— data-cq 是给「战场卡容器查询排版」(P1 A) 的惰性钩子，只被
          index.css 里 `[data-field-area]` 作用域的 cqh 规则消费；其它 7 个用 Card 的界面无此祖先，零影响。 */}
      <div data-cq="icon" className="text-center text-sm sm:text-lg leading-none mt-0.5 sm:mt-1">{faction?.icon}</div>

      {/* 名称 */}
      <div data-cq="name" className="text-center text-[9px] sm:text-xs font-bold text-white truncate mt-0.5 sm:mt-1">{cardName(card)}</div>

      {/* 阵营名 */}
      <div data-cq="faction" className="text-center text-[8px] sm:text-[10px] text-white/50 hidden sm:block">{lang === 'en' ? (faction?.nameEn || faction?.name) : faction?.name}</div>

      {isEvent ? (
        /* data-cq="eventdesc"：和生物卡那几行同一套钩子。事件卡的 effectDescription 长度
           从 6 字到 54 字不等，**没有行数封顶就是无界内容装进有界卡框** —— iPad 横屏实测
           「基因突变」溢出 77px（文字压到卡外、盖住底部状态栏）。
           字号与行数封顶都交给 index.css 的 [data-cq-card] 作用域（跟卡高走），
           完整文案点 ⓘ 看详情。⚠️ 这里的 min-h 会被那边的 min-height:0 覆盖，别当它还管用。 */
        <div data-cq="eventdesc" className="mt-1 mb-0.5 sm:mt-1.5 sm:mb-1 text-[7px] sm:text-[9px] text-emerald-200 text-center leading-tight px-0.5 sm:px-1 min-h-[16px] sm:min-h-[24px]">
          {card.effectDescription}
        </div>
      ) : (
        <>
          <div data-cq="hpbar" className="relative h-2 sm:h-3 bg-gray-800 rounded-full overflow-hidden mt-1 mb-0.5 sm:mt-1.5 sm:mb-1">
            <motion.div
              className={`absolute inset-y-0 left-0 ${hpColor} rounded-full`}
              initial={false}
              animate={{ width: `${hpPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
            <div data-cq="hptext" className="absolute inset-0 flex items-center justify-center text-[8px] sm:text-[10px] font-bold text-white drop-shadow">
              {hp}/{maxHp}
            </div>
          </div>

          <div data-cq="stats" className="flex items-center justify-between text-[8px] sm:text-[10px] text-white/80">
            <span>⚔️{card.atk}</span>
            {card.skills?.length > 0 && (
              <span data-cq="skill" className="text-yellow-300 truncate max-w-[40px] sm:max-w-[60px]" title={card.skills.map(s => skillName(s)).join(', ')}>
                {skillName(card.skills[0])}
              </span>
            )}
          </div>
        </>
      )}

      {/* SP 召唤回合门槛（看费用；与 useBattle 门槛逻辑同一公式 spEarliestSummonTurn）*/}
      {isSp && (
        <div className="text-center text-[8px] sm:text-[9px] text-amber-300/90 mt-0.5 leading-tight">
          🕐 {t('card.spSummonTurn', { n: spEarliestSummonTurn(card.spCost) })}
        </div>
      )}

      {/* 阵营标记需求 */}
      {!isEvent && card.factionRequirement && (
        <div data-cq="factionreq" className="text-center text-[8px] sm:text-[9px] text-amber-300/80 mt-0.5 truncate">
          {t('card.factionReq', { icon: FACTIONS[card.factionRequirement.faction]?.icon, count: card.factionRequirement.count, name: localName(FACTIONS[card.factionRequirement.faction]) })}
        </div>
      )}

      {/* SP召唤标记 */}
      {isEvent && card.spSummonRule && (
        /* 同样要钩子：它此前是「无钩子的固定 9px」，在 115px 的卡上白占 15.5px（实测），
           正是事件卡最后那 2px 溢出的来源之一。 */
        <div data-cq="sptrigger" className="text-center text-[9px] text-yellow-300 mt-0.5">
          {t('card.spTrigger')}
        </div>
      )}
    </div>
  )
})

BattleCard.displayName = 'BattleCard'
export default BattleCard
