import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BattleCard from './Card'
import { FACTIONS } from '../data/deckRules'
import { useLanguage } from '../i18n/LanguageContext'

// Phase A Step 4: 抽到首次见的卡时全屏展示。
// 多张 isNew 时支持"下一张"和"跳过全部"。完成后 onDone 回调。

function TypewriterText({ text, speed = 28 }) {
  const [shown, setShown] = useState('')
  useEffect(() => {
    setShown('')
    if (!text) return
    let i = 0
    const id = setInterval(() => {
      i++
      setShown(text.slice(0, i))
      if (i >= text.length) clearInterval(id)
    }, speed)
    return () => clearInterval(id)
  }, [text, speed])
  return <span>{shown}</span>
}

const rarityColor = {
  R: 'text-blue-300 bg-blue-900/40',
  SR: 'text-purple-300 bg-purple-900/40',
  SSR: 'text-yellow-300 bg-yellow-900/40',
  SP: 'text-pink-300 bg-pink-900/40',
}

export default function CardShowcase({ cards, onDone }) {
  const { t, lang, cardName, skillName } = useLanguage()
  const [idx, setIdx] = useState(0)

  if (!cards || cards.length === 0) return null
  const card = cards[idx]
  const faction = FACTIONS[card.faction]
  const cost = card.cost ?? card.spCost
  const isLast = idx >= cards.length - 1

  const next = () => {
    if (isLast) onDone()
    else setIdx(i => i + 1)
  }

  return (
    <motion.div
      className="fixed inset-0 z-[110] bg-black/92 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 顶部：🆕 NEW + 进度 */}
      <div className="text-center pt-6 pb-2 shrink-0">
        <motion.div
          className="text-2xl font-black"
          style={{
            background: 'linear-gradient(90deg,#fbbf24,#f472b6,#fbbf24)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 20px rgba(251,191,36,0.5)',
          }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          🆕 {lang === 'en' ? 'First time meeting!' : '第一次见到！'}
        </motion.div>
        {cards.length > 1 && (
          <div className="text-xs text-gray-400 mt-1">{idx + 1} / {cards.length}</div>
        )}
      </div>

      {/* 中部：卡牌 + 信息 */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={card.id + '_' + idx}
            initial={{ scale: 0.7, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 14 }}
            className="flex flex-col items-center"
          >
            {/* 大尺寸卡牌（约 1.4x 普通战斗卡）*/}
            <div className="w-[140px] h-[200px] mb-3 relative">
              <BattleCard card={card} hp={card.hp || 0} maxHp={card.hp || 1} isPlayer={true} isActive={false} />
            </div>

            <h2 className="text-2xl font-black text-white text-center">{cardName(card)}</h2>
            <div className="text-xs text-gray-500 mb-2">{lang === 'en' ? card.name : card.nameEn}</div>

            <div className="flex flex-wrap justify-center items-center gap-2 mb-3 text-xs">
              {faction && (
                <span className="px-2 py-0.5 bg-gray-800 rounded-full">
                  {faction.icon} {lang === 'en' && faction.nameEn ? faction.nameEn : faction.name}
                </span>
              )}
              {card.rarity && (
                <span className={`px-2 py-0.5 rounded-full font-bold ${rarityColor[card.rarity] || 'bg-gray-800 text-gray-300'}`}>
                  {card.rarity}
                </span>
              )}
              {card.subType && (
                <span className="px-2 py-0.5 bg-gray-800 rounded-full text-gray-300">{card.subType}</span>
              )}
            </div>

            <div className="flex justify-center gap-5 text-base mb-4">
              {card.atk != null && <span className="text-red-400 font-bold">⚔️ {card.atk}</span>}
              {card.hp != null && <span className="text-green-400 font-bold">❤️ {card.hp}</span>}
              {cost != null && <span className="text-blue-400 font-bold">⚡ {cost}</span>}
            </div>

            {card.skills?.length > 0 && (
              <div className="w-full max-w-md space-y-2 mb-3">
                {card.skills.map((s, i) => (
                  <div key={i} className="bg-purple-900/40 border-l-4 border-purple-400 rounded p-3">
                    <div className="text-sm font-bold text-purple-200 mb-1">🎯 {skillName(s)}</div>
                    <div className="text-xs text-gray-100 leading-relaxed">
                      <TypewriterText text={s.description} speed={22} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {card.effectDescription && (
              <div className="w-full max-w-md mb-3 bg-amber-900/30 border-l-4 border-amber-400 rounded p-3 text-xs text-amber-100">
                📜 <TypewriterText text={card.effectDescription} speed={22} />
              </div>
            )}

            {card.scienceCard && (
              <div className="w-full max-w-md bg-cyan-900/30 border-l-4 border-cyan-400 rounded p-3">
                <div className="text-xs font-bold text-cyan-300 mb-1">📖 {lang === 'en' ? 'Did you know?' : '你知道吗？'}</div>
                <div className="text-xs text-gray-100 leading-relaxed">
                  <TypewriterText text={card.scienceCard} speed={22} />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 底部按钮 */}
      <div className="shrink-0 px-4 pb-6 pt-2 flex gap-3 bg-gradient-to-t from-black to-transparent">
        {cards.length > 1 && !isLast && (
          <button
            onClick={onDone}
            className="text-gray-400 text-sm px-4 py-2 hover:text-gray-200"
          >
            {lang === 'en' ? 'Skip all' : '跳过全部'}
          </button>
        )}
        <button
          onClick={next}
          className="flex-1 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-bold py-3 rounded-xl shadow-lg shadow-cyan-500/30"
        >
          {isLast
            ? (lang === 'en' ? 'Done ✓' : '完成 ✓')
            : (lang === 'en' ? 'Next →' : '下一张 →')}
        </button>
      </div>
    </motion.div>
  )
}
