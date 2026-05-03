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

export default function CardDetailModal({ card, onClose, badge }) {
  const { t, lang, cardName, skillName } = useLanguage()
  if (!card) return null

  const faction = FACTIONS[card.faction]
  const cost = card.cost ?? card.spCost

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-gray-900 rounded-2xl p-5 max-w-md w-full border border-gray-700 max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-center mb-3">
            <BattleCard
              card={card}
              hp={card.hp || 0}
              maxHp={card.hp || 1}
              isPlayer={true}
              isActive={false}
            />
          </div>

          {badge && <div className="text-center mb-2">{badge}</div>}

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
                </div>
              ))}
            </div>
          )}

          {card.effectDescription && (
            <div className="mb-3 bg-amber-900/20 border-l-4 border-amber-400 rounded p-2.5 text-xs text-amber-100 leading-relaxed">
              📜 {card.effectDescription}
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

          <button
            onClick={onClose}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded-lg mt-1 text-sm"
          >
            {t('collection.detail.close')}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
