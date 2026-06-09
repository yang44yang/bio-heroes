import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BattleCard from './Card'
import { FACTIONS } from '../data/deckRules'
import { useLanguage } from '../i18n/LanguageContext'

const rarityColor = {
  R: 'text-blue-300',
  SR: 'text-purple-300',
  SSR: 'text-yellow-300',
  SP: 'text-pink-300',
}

// 通用卡牌详情弹窗 — 战斗 / 抽卡 / 卡组 / 图鉴 全场景共用
//
// 场景专属内容通过 slot 注入：
//   actions   — 自定义底部按钮行（如"加入卡组"/"进化"）。不传则渲染默认"关闭"按钮
//   children  — 额外内容块（如进化链、碎片商店），渲染在 tags / ownership 之后
//   overlay   — 绝对定位覆盖层（如 Collection 的进化动画）
//   cardAnimate — forwarded 给卡牌视觉外层 motion.div 的 animate（进化抖动等）
//   closeOnBackdrop — 点背景是否关闭（Collection 进化动画进行时设 false）
export default function CardDetailModal({
  card,
  onClose,
  badge,
  context = 'collection',
  ownership = null,
  isNew = false,
  actions = null,
  children = null,
  overlay = null,
  cardAnimate = null,
  closeOnBackdrop = true,
}) {
  const { t, lang, cardName, skillName } = useLanguage()
  if (!card) return null

  const faction = FACTIONS[card.faction]
  const cost = card.cost ?? card.spCost
  const showOwnership = ownership && (context === 'gacha' || context === 'deck' || context === 'collection')
  const req = card.factionRequirement

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeOnBackdrop ? onClose : undefined}
      >
        <motion.div
          className="relative bg-gray-900 rounded-2xl p-5 max-w-md w-full border border-gray-700 max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          onClick={e => e.stopPropagation()}
        >
          {/* 场景专属覆盖层（如进化动画） */}
          {overlay}

          <div className="flex justify-center mb-3">
            <motion.div animate={cardAnimate || undefined}>
              <BattleCard
                card={card}
                hp={card.hp || 0}
                maxHp={card.hp || 1}
                isPlayer={true}
                isActive={false}
              />
            </motion.div>
          </div>

          {badge && <div className="text-center mb-2">{badge}</div>}
          {isNew && (
            <div className="text-center mb-2">
              <span className="inline-block px-2 py-0.5 rounded-full bg-yellow-500/90 text-black text-[10px] font-black animate-pulse">
                ✨ NEW
              </span>
            </div>
          )}

          <h3 className="text-lg font-bold text-white text-center mb-0.5">{cardName(card)}</h3>
          <p className="text-xs text-gray-500 text-center mb-2">
            {lang === 'en' ? card.name : card.nameEn}
          </p>

          <div className="flex items-center justify-center gap-2 mb-3 text-xs">
            {faction && (
              <span className="px-2 py-0.5 bg-gray-800 rounded-full">
                {faction.icon} {lang === 'en' && faction.nameEn ? faction.nameEn : faction.name}
              </span>
            )}
            {(card.type === 'sp' || card.rarity) && (
              <span className={`px-2 py-0.5 bg-gray-800 rounded-full font-bold ${
                card.type === 'sp' ? rarityColor.SP : (rarityColor[card.rarity] || 'text-gray-300')
              }`}>
                {card.type === 'sp' ? '⚡ SP' : card.rarity}
              </span>
            )}
            {card.subType && (
              <span className="px-2 py-0.5 bg-gray-800 rounded-full text-gray-300">{card.subType}</span>
            )}
          </div>

          <div className="flex justify-center gap-4 text-sm mb-3">
            {card.atk != null && <span className="text-red-400">⚔️ {card.atk}</span>}
            {card.hp != null && <span className="text-green-400">❤️ {card.hp}</span>}
            {cost != null && <span className="text-blue-400">{t('collection.detail.cost', { n: cost })}</span>}
          </div>

          {card.skills?.length > 0 && (
            <div className="mb-3 space-y-2">
              {card.skills.map((s, i) => (
                <div key={i} className="bg-purple-900/30 border-l-4 border-purple-400 rounded p-2.5">
                  <div className="text-sm font-bold text-purple-200 mb-0.5">🎯 {skillName(s)}</div>
                  <div className="text-xs text-gray-200 leading-relaxed">{s.description}</div>
                  {s.scienceNote && (
                    <div className="text-[10px] text-blue-300/70 mt-1">💡 {s.scienceNote}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {card.effectDescription && (
            <div className="mb-3 bg-amber-900/20 border-l-4 border-amber-400 rounded p-2.5 text-xs text-amber-100 leading-relaxed">
              📜 {card.effectDescription}
            </div>
          )}

          {req && (
            <div className="mb-3 bg-yellow-900/20 border-l-4 border-yellow-500 rounded p-2.5 text-xs text-yellow-200 leading-relaxed">
              {t('card.reqCondition', { icon: FACTIONS[req.faction]?.icon, name: FACTIONS[req.faction]?.name, count: req.count })}
              {req.type === 'consume' && t('card.consumeOnPlay')}
            </div>
          )}

          {card.scienceCard && (
            <div className="mb-3 bg-cyan-900/20 border-l-4 border-cyan-400 rounded p-2.5">
              <div className="text-xs font-bold text-cyan-300 mb-1">📖 {lang === 'en' ? 'Did you know?' : '你知道吗？'}</div>
              <div className="text-xs text-gray-200 leading-relaxed">{card.scienceCard}</div>
            </div>
          )}

          {card.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {card.tags.map(tag => (
                <span key={tag} className="text-[10px] bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {showOwnership && (
            <div className="mb-3 bg-gray-800/40 rounded-lg p-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-300">{lang === 'en' ? 'Owned' : '持有'}</span>
                <span className="text-white font-bold">
                  {ownership.count ?? 0} / 3
                  {(ownership.count ?? 0) >= 3 && <span className="ml-2 text-green-400 text-[10px]">✓ {lang === 'en' ? 'Full' : '已齐'}</span>}
                </span>
              </div>
              {ownership.fragments > 0 && (
                <div className="flex justify-between items-center text-xs mt-1">
                  <span className="text-gray-300">{lang === 'en' ? 'Fragments' : '碎片'}</span>
                  <span className="text-yellow-300 font-bold">{ownership.fragments}</span>
                </div>
              )}
            </div>
          )}

          {/* 场景专属内容块（进化链 / 碎片商店等） */}
          {children}

          {/* 底部按钮：传 actions 用自定义，否则默认关闭按钮 */}
          {actions || (
            <button
              onClick={onClose}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded-lg mt-1 text-sm"
            >
              {t('collection.detail.close')}
            </button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
