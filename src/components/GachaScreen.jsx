import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGacha } from '../hooks/useGacha'
import { FACTIONS } from '../data/deckRules'
import BattleCard from './Card'
import CardDetailModal from './CardDetailModal'
import GachaAnimation from './GachaAnimation'
import CardShowcase from './CardShowcase'
import { useLanguage } from '../i18n/LanguageContext'

const rarityColors = {
  R: 'text-blue-400',
  SR: 'text-purple-400',
  SSR: 'text-yellow-400',
}

const rarityBg = {
  R: 'border-blue-500/50',
  SR: 'border-purple-500/50 shadow-purple-500/20 shadow-lg',
  SSR: 'border-yellow-400/50 shadow-yellow-400/30 shadow-xl',
}

export default function GachaScreen({ onBack, economy }) {
  const { t } = useLanguage()
  const { pull } = useGacha()
  const [pulled, setPulled] = useState([])
  const [pulling, setPulling] = useState(false)
  const [results, setResults] = useState([])
  const [detailCard, setDetailCard] = useState(null)
  const [animatingCards, setAnimatingCards] = useState(null)
  const [showcaseCards, setShowcaseCards] = useState(null)

  const doPull = (count) => {
    const cost = count === 1 ? economy.SINGLE_COST : economy.MULTI_COST
    if (!economy.canAfford(cost)) return

    economy.spendCoins(cost)
    setPulling(true)
    setPulled([])
    setResults([])

    const { pulled: newCards } = pull(count, economy.pityCounter, economy.SSR_PITY)
    const enriched = economy.pullCards(newCards)
    setPulled(newCards)
    setAnimatingCards(enriched)
  }

  const handleAnimationDone = () => {
    const finished = animatingCards || []
    setResults(finished)
    setAnimatingCards(null)
    setPulling(false)
    const newCards = finished.filter(c => c.isNew)
    if (newCards.length > 0) setShowcaseCards(newCards)
  }

  const pityDisplay = economy.SSR_PITY - economy.pityCounter

  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-4">
      <h1 className="text-3xl font-black text-yellow-400 mb-1">{t('gacha.title')}</h1>
      <p className="text-gray-400 text-sm mb-4">{t('gacha.subtitle')}</p>

      {/* Currency display */}
      <div className="flex gap-4 mb-6 text-sm">
        <span className="text-yellow-400 font-bold">🪙 {economy.coins}</span>
        <span className="text-cyan-400 font-bold">💎 {economy.diamonds}</span>
        <span className="text-gray-500">{t('gacha.collected', { n: Object.keys(economy.collection).length })}</span>
        <span className="text-gray-600">{t('gacha.pity', { n: pityDisplay })}</span>
      </div>

      {/* Pull buttons */}
      <div className="flex gap-4 mb-6">
        <motion.button
          className={`px-5 py-3 rounded-xl font-bold flex flex-col items-center ${
            economy.canAfford(economy.SINGLE_COST)
              ? 'bg-blue-600 hover:bg-blue-500 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
          whileHover={economy.canAfford(economy.SINGLE_COST) ? { scale: 1.05 } : {}}
          whileTap={economy.canAfford(economy.SINGLE_COST) ? { scale: 0.95 } : {}}
          onClick={() => doPull(1)}
          disabled={pulling || !economy.canAfford(economy.SINGLE_COST)}
        >
          <span className="text-lg">{t('gacha.single')}</span>
          <span className="text-xs opacity-70">🪙 {economy.SINGLE_COST}</span>
        </motion.button>
        <motion.button
          className={`px-5 py-3 rounded-xl font-bold flex flex-col items-center ${
            economy.canAfford(economy.MULTI_COST)
              ? 'bg-purple-600 hover:bg-purple-500 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
          whileHover={economy.canAfford(economy.MULTI_COST) ? { scale: 1.05 } : {}}
          whileTap={economy.canAfford(economy.MULTI_COST) ? { scale: 0.95 } : {}}
          onClick={() => doPull(10)}
          disabled={pulling || !economy.canAfford(economy.MULTI_COST)}
        >
          <span className="text-lg">{t('gacha.multi')}</span>
          <span className="text-xs opacity-70">🪙 {economy.MULTI_COST} {t('gacha.multiGuarantee')}</span>
        </motion.button>
      </div>

      {/* Pull results */}
      {!pulling && results.length > 0 && (
        <motion.div
          key="results"
          className="flex gap-3 flex-wrap justify-center max-w-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {results.map((card, i) => (
            <motion.div
              key={card.instanceId || `${card.id}_${i}`}
              className={`relative rounded-xl border-2 ${rarityBg[card.rarity] || ''} overflow-hidden cursor-pointer`}
              initial={{ opacity: 0, y: 40, rotateY: 180 }}
              animate={{ opacity: 1, y: 0, rotateY: 0 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              transition={{ delay: i * 0.15, type: 'spring', damping: 12 }}
              onClick={() => setDetailCard(card)}
            >
              <BattleCard card={card} hp={card.hp || 0} maxHp={card.hp || 1} isPlayer={true} isActive={false} />
              {card.isNew ? (
                <div className="absolute top-0 left-0 bg-green-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-br-lg">NEW!</div>
              ) : card.isDupe ? (
                <div className="absolute top-0 left-0 bg-amber-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-br-lg">{t('gacha.fragments', { n: card.fragments })}</div>
              ) : (
                <div className="absolute top-0 left-0 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-br-lg">×{card.count}</div>
              )}
              <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-cyan-600/90 text-white text-[11px] font-bold flex items-center justify-center shadow pointer-events-none">i</div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Back button */}
      <motion.button
        className="mt-8 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300"
        whileTap={{ scale: 0.95 }}
        onClick={onBack}
      >
        {t('gacha.back')}
      </motion.button>

      <AnimatePresence>
        {animatingCards && (
          <GachaAnimation cards={animatingCards} onDone={handleAnimationDone} />
        )}
        {showcaseCards && (
          <CardShowcase cards={showcaseCards} onDone={() => setShowcaseCards(null)} />
        )}
      </AnimatePresence>

      {detailCard && (
        <CardDetailModal
          card={detailCard}
          onClose={() => setDetailCard(null)}
          badge={
            detailCard.isNew ? (
              <span className="text-[10px] font-black bg-green-500 text-white px-2 py-0.5 rounded-full">NEW!</span>
            ) : detailCard.isDupe ? (
              <span className="text-[10px] font-bold bg-amber-600 text-white px-2 py-0.5 rounded-full">{t('gacha.fragments', { n: detailCard.fragments })}</span>
            ) : (
              <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">×{detailCard.count}</span>
            )
          }
        />
      )}
    </div>
  )
}
