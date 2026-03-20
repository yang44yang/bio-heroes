import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGacha } from '../hooks/useGacha'
import { FACTIONS } from '../data/deckRules'
import BattleCard from './Card'

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
  const { pull } = useGacha()
  const [pulled, setPulled] = useState([])
  const [pulling, setPulling] = useState(false)
  const [results, setResults] = useState([]) // with isNew/fragments info

  const doPull = (count) => {
    const cost = count === 1 ? economy.SINGLE_COST : economy.MULTI_COST
    if (!economy.canAfford(cost)) return

    economy.spendCoins(cost)
    setPulling(true)
    setPulled([])
    setResults([])

    setTimeout(() => {
      const { pulled: newCards, newPityCounter } = pull(count, economy.pityCounter, economy.SSR_PITY)
      // Process through economy (collection + fragments)
      economy.pullCards(newCards)
      // Mark new vs dupe
      const enriched = newCards.map(card => ({
        ...card,
        isNew: !economy.collection.includes(card.id),
        fragments: economy.collection.includes(card.id)
          ? (card.rarity === 'SSR' ? 50 : card.rarity === 'SR' ? 20 : 10)
          : 0,
      }))
      setPulled(newCards)
      setResults(enriched)
      setPulling(false)
    }, 600)
  }

  const pityDisplay = economy.SSR_PITY - economy.pityCounter

  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-4">
      <h1 className="text-3xl font-black text-yellow-400 mb-1">🎰 抽卡</h1>
      <p className="text-gray-400 text-sm mb-4">收集生物英雄，组建最强战队！</p>

      {/* Currency display */}
      <div className="flex gap-4 mb-6 text-sm">
        <span className="text-yellow-400 font-bold">🪙 {economy.coins}</span>
        <span className="text-cyan-400 font-bold">💎 {economy.diamonds}</span>
        <span className="text-gray-500">已收集 {economy.collection.length} 张</span>
        <span className="text-gray-600">SSR保底: {pityDisplay}抽</span>
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
          <span className="text-lg">单抽 ×1</span>
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
          <span className="text-lg">十连抽 ×10</span>
          <span className="text-xs opacity-70">🪙 {economy.MULTI_COST} (保底SR+)</span>
        </motion.button>
      </div>

      {/* Pull results */}
      <AnimatePresence mode="wait">
        {pulling && (
          <motion.div
            key="pulling"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-2xl text-yellow-400 animate-bounce"
          >
            ✨ 抽取中...
          </motion.div>
        )}
        {results.length > 0 && (
          <motion.div
            key="results"
            className="flex gap-3 flex-wrap justify-center max-w-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {results.map((card, i) => {
              const faction = FACTIONS[card.faction]
              return (
                <motion.div
                  key={card.instanceId}
                  className={`relative rounded-xl border-2 ${rarityBg[card.rarity]} overflow-hidden`}
                  initial={{ opacity: 0, y: 40, rotateY: 180 }}
                  animate={{ opacity: 1, y: 0, rotateY: 0 }}
                  transition={{ delay: i * 0.15, type: 'spring', damping: 12 }}
                >
                  <BattleCard card={card} hp={card.hp || 0} maxHp={card.hp || 1} isPlayer={true} isActive={false} />
                  {/* New / Dupe badge */}
                  {card.isNew ? (
                    <div className="absolute top-0 left-0 bg-green-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-br-lg">
                      NEW!
                    </div>
                  ) : (
                    <div className="absolute top-0 left-0 bg-gray-600 text-gray-300 text-[9px] font-bold px-1.5 py-0.5 rounded-br-lg">
                      +{card.fragments}碎片
                    </div>
                  )}
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back button */}
      <motion.button
        className="mt-8 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300"
        whileTap={{ scale: 0.95 }}
        onClick={onBack}
      >
        ← 返回主菜单
      </motion.button>
    </div>
  )
}
