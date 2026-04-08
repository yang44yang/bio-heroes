import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BattleCard from './Card'
import cards from '../data/cards'
import eventCards from '../data/eventCards'
import spCards from '../data/spCards'
import { FACTIONS, SUBTYPES } from '../data/deckRules'
import { EVOLUTION_CHAINS, getEvolutionTarget, getChainForCard } from '../data/evolutions'
import { useLanguage } from '../i18n/LanguageContext'

const allCards = [...cards, ...eventCards, ...spCards]
const TOTAL_CARDS = allCards.length // 64
const cardMap = Object.fromEntries(allCards.map(c => [c.id, c]))

// 稀有度颜色
const rarityLabel = { R: 'text-blue-400', SR: 'text-purple-400', SSR: 'text-yellow-400' }

export default function Collection({ onBack, economy }) {
  const { t, lang, cardName, skillName } = useLanguage()
  const [filterFaction, setFilterFaction] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [selectedCard, setSelectedCard] = useState(null)
  const [showEvolutionChain, setShowEvolutionChain] = useState(null) // chain id
  const [evolving, setEvolving] = useState(false) // 进化动画中

  const owned = economy.collection // array of card ids
  const ownedCount = owned.length
  const progress = Math.round((ownedCount / TOTAL_CARDS) * 100)

  const filtered = useMemo(() => {
    let pool = allCards
    if (filterFaction !== 'all') pool = pool.filter(c => c.faction === filterFaction)
    if (filterType !== 'all') pool = pool.filter(c => c.type === filterType)
    // Sort: owned first, then by cost
    return pool.sort((a, b) => {
      const aOwned = owned.includes(a.id) ? 0 : 1
      const bOwned = owned.includes(b.id) ? 0 : 1
      if (aOwned !== bOwned) return aOwned - bOwned
      return (a.cost || a.spCost || 0) - (b.cost || b.spCost || 0)
    })
  }, [filterFaction, filterType, owned])

  // Faction stats
  const factionStats = useMemo(() => {
    const stats = {}
    for (const [key] of Object.entries(FACTIONS)) {
      const total = allCards.filter(c => c.faction === key).length
      const have = allCards.filter(c => c.faction === key && owned.includes(c.id)).length
      stats[key] = { total, have }
    }
    return stats
  }, [owned])

  // 进化处理
  const handleEvolve = useCallback((cardId) => {
    const evoInfo = economy.checkEvolution(cardId)
    if (!evoInfo || !evoInfo.canEvolve) return

    setEvolving(true)
    // 延迟执行进化，让动画先播放
    setTimeout(() => {
      const success = economy.evolveCard(cardId)
      if (success) {
        // 进化成功后切换到新卡
        const newCard = cardMap[evoInfo.target.targetCardId]
        setTimeout(() => {
          setEvolving(false)
          if (newCard) setSelectedCard(newCard)
        }, 600)
      } else {
        setEvolving(false)
      }
    }, 800)
  }, [economy])

  // 获取选中卡的进化信息
  const selectedEvoInfo = selectedCard ? economy.checkEvolution(selectedCard.id) : null
  const selectedChain = selectedCard ? getChainForCard(selectedCard.id) : null

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black text-yellow-400">{t('collection.title')}</h1>
        <button
          className="text-sm px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg"
          onClick={onBack}
        >
          {t('collection.back')}
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-400">{t('collection.progress')}</span>
          <span className="text-yellow-400 font-bold">{ownedCount}/{TOTAL_CARDS} ({progress}%)</span>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8 }}
          />
        </div>
      </div>

      {/* Faction distribution */}
      <div className="flex gap-2 mb-4">
        {Object.entries(FACTIONS).map(([key, f]) => {
          const stat = factionStats[key]
          return (
            <div
              key={key}
              className="flex-1 rounded-lg p-2 text-center cursor-pointer hover:opacity-80"
              style={{ background: `${f.color}15`, border: `1px solid ${f.color}30` }}
              onClick={() => setFilterFaction(filterFaction === key ? 'all' : key)}
            >
              <div className="text-lg">{f.icon}</div>
              <div className="text-[10px] font-bold" style={{ color: f.color }}>
                {stat.have}/{stat.total}
              </div>
            </div>
          )
        })}
      </div>

      {/* Evolution Chains Section */}
      <div className="mb-4">
        <h2 className="text-sm font-bold text-amber-400 mb-2">{t('collection.evoChains')}</h2>
        <div className="flex flex-col gap-2">
          {EVOLUTION_CHAINS.map(chain => {
            const faction = FACTIONS[chain.faction]
            return (
              <div
                key={chain.id}
                className="bg-gray-800/60 rounded-xl p-3 border border-gray-700 cursor-pointer hover:border-amber-500/50 transition-colors"
                onClick={() => setShowEvolutionChain(showEvolutionChain === chain.id ? null : chain.id)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{faction?.icon}</span>
                  <span className="text-xs font-bold text-gray-300">{chain.name}</span>
                  <span className="text-[10px] text-gray-500 ml-auto">
                    {showEvolutionChain === chain.id ? t('collection.collapse') : t('collection.expand')}
                  </span>
                </div>

                {/* 简略进化链展示 */}
                <div className="flex items-center gap-1 text-xs">
                  {chain.steps.map((step, i) => {
                    const card = cardMap[step.cardId]
                    const isOwned = owned.includes(step.cardId)
                    return (
                      <React.Fragment key={step.cardId}>
                        <span className={`${isOwned ? rarityLabel[step.rarity] : 'text-gray-600'} font-bold`}>
                          {card?.name?.split('·')[0] || step.cardId}
                        </span>
                        <span className={`text-[9px] ${isOwned ? 'text-gray-400' : 'text-gray-600'}`}>
                          ({step.rarity})
                        </span>
                        {i < chain.steps.length - 1 && (
                          <span className="text-amber-500 mx-1">→</span>
                        )}
                      </React.Fragment>
                    )
                  })}
                </div>

                {/* 展开的进化链详情 */}
                <AnimatePresence>
                  {showEvolutionChain === chain.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-gray-700">
                        {chain.steps.map((step, i) => {
                          const card = cardMap[step.cardId]
                          const isOwned = owned.includes(step.cardId)
                          const fragments = economy.fragments[step.cardId] || 0
                          const evo = getEvolutionTarget(step.cardId)

                          return (
                            <React.Fragment key={step.cardId}>
                              <div className="flex flex-col items-center">
                                <div
                                  className={`${!isOwned ? 'grayscale opacity-40' : ''} cursor-pointer`}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (isOwned && card) setSelectedCard(card)
                                  }}
                                >
                                  <div className="transform scale-75 origin-center">
                                    <BattleCard
                                      card={card}
                                      hp={card?.hp || 0}
                                      maxHp={card?.hp || 1}
                                      isPlayer={true}
                                      isActive={false}
                                    />
                                  </div>
                                </div>
                                {isOwned && fragments > 0 && (
                                  <div className="text-[9px] text-amber-400 mt-0.5">
                                    {t('collection.fragments', { n: fragments })}
                                  </div>
                                )}
                                {!isOwned && (
                                  <div className="text-[9px] text-gray-500 mt-0.5">{t('collection.notOwned')}</div>
                                )}
                              </div>

                              {/* 进化箭头 + 碎片消耗 */}
                              {i < chain.steps.length - 1 && (
                                <div className="flex flex-col items-center">
                                  <div className="text-amber-500 text-xl font-bold">⟶</div>
                                  <div className="text-[9px] text-gray-400">
                                    {evo ? t('collection.fragCost', { n: evo.fragmentCost }) : ''}
                                  </div>
                                </div>
                              )}
                            </React.Fragment>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <select
          className="bg-gray-800 text-xs text-gray-300 rounded px-2 py-1 border border-gray-700"
          value={filterFaction}
          onChange={e => setFilterFaction(e.target.value)}
        >
          <option value="all">{t('collection.allFaction')}</option>
          {Object.entries(FACTIONS).map(([key, f]) => (
            <option key={key} value={key}>{f.icon} {lang === 'en' ? (f.nameEn || f.name) : f.name}</option>
          ))}
        </select>
        <select
          className="bg-gray-800 text-xs text-gray-300 rounded px-2 py-1 border border-gray-700"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="all">{t('collection.allType')}</option>
          <option value="character">{t('collection.character')}</option>
          <option value="event">{t('collection.event')}</option>
          <option value="sp">{t('collection.sp')}</option>
        </select>
        <span className="text-xs text-gray-500 self-center ml-auto">
          {t('collection.showing', { n: filtered.length })}
        </span>
      </div>

      {/* Card grid — grouped by subType when faction is selected */}
      {filterFaction !== 'all' && SUBTYPES[filterFaction] ? (
        // Grouped by subType
        <div className="space-y-4">
          {SUBTYPES[filterFaction].map(st => {
            const groupCards = filtered.filter(c => c.subType === st.key)
            if (groupCards.length === 0) return null
            return (
              <div key={st.key}>
                <h3 className="text-xs font-bold text-gray-400 mb-2 border-b border-gray-700 pb-1">{st.name}</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {groupCards.map(card => {
                    const isOwned = owned.includes(card.id)
                    const fragments = economy.fragments[card.id] || 0
                    const evo = getEvolutionTarget(card.id)
                    const canEvolve = evo && isOwned && fragments >= evo.fragmentCost
                    return (
                      <motion.div
                        key={card.id}
                        className={`relative cursor-pointer ${!isOwned ? 'grayscale opacity-40' : ''}`}
                        whileHover={isOwned ? { scale: 1.05 } : {}}
                        onClick={() => isOwned && setSelectedCard(card)}
                      >
                        <BattleCard card={card} hp={card.hp || 0} maxHp={card.hp || 1} isPlayer={true} isActive={false} />
                        {!isOwned && <div className="absolute inset-0 flex items-center justify-center"><span className="text-3xl">❓</span></div>}
                        {isOwned && fragments > 0 && <div className="absolute bottom-1 right-1 text-[9px] bg-gray-900/80 text-amber-400 px-1 rounded">{t('collection.fragments', { n: fragments })}</div>}
                        {canEvolve && <motion.div className="absolute -top-1 -right-1 text-sm z-30" animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>🧬</motion.div>}
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {/* Cards without matching subType (e.g. event cards with no subType) */}
          {(() => {
            const subTypeKeys = SUBTYPES[filterFaction].map(st => st.key)
            const ungrouped = filtered.filter(c => !subTypeKeys.includes(c.subType))
            if (ungrouped.length === 0) return null
            return (
              <div>
                <h3 className="text-xs font-bold text-gray-400 mb-2 border-b border-gray-700 pb-1">{t('collection.detail.eventCards')}</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {ungrouped.map(card => {
                    const isOwned = owned.includes(card.id)
                    const fragments = economy.fragments[card.id] || 0
                    const evo = getEvolutionTarget(card.id)
                    const canEvolve = evo && isOwned && fragments >= evo.fragmentCost
                    return (
                      <motion.div
                        key={card.id}
                        className={`relative cursor-pointer ${!isOwned ? 'grayscale opacity-40' : ''}`}
                        whileHover={isOwned ? { scale: 1.05 } : {}}
                        onClick={() => isOwned && setSelectedCard(card)}
                      >
                        <BattleCard card={card} hp={card.hp || 0} maxHp={card.hp || 1} isPlayer={true} isActive={false} />
                        {!isOwned && <div className="absolute inset-0 flex items-center justify-center"><span className="text-3xl">❓</span></div>}
                        {isOwned && fragments > 0 && <div className="absolute bottom-1 right-1 text-[9px] bg-gray-900/80 text-amber-400 px-1 rounded">{t('collection.fragments', { n: fragments })}</div>}
                        {canEvolve && <motion.div className="absolute -top-1 -right-1 text-sm z-30" animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>🧬</motion.div>}
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </div>
      ) : (
        // Flat grid (no faction selected)
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {filtered.map(card => {
            const isOwned = owned.includes(card.id)
            const fragments = economy.fragments[card.id] || 0
            const evo = getEvolutionTarget(card.id)
            const canEvolve = evo && isOwned && fragments >= evo.fragmentCost
            return (
              <motion.div
                key={card.id}
                className={`relative cursor-pointer ${!isOwned ? 'grayscale opacity-40' : ''}`}
                whileHover={isOwned ? { scale: 1.05 } : {}}
                onClick={() => isOwned && setSelectedCard(card)}
              >
                <BattleCard card={card} hp={card.hp || 0} maxHp={card.hp || 1} isPlayer={true} isActive={false} />
                {!isOwned && <div className="absolute inset-0 flex items-center justify-center"><span className="text-3xl">❓</span></div>}
                {isOwned && fragments > 0 && <div className="absolute bottom-1 right-1 text-[9px] bg-gray-900/80 text-amber-400 px-1 rounded">{t('collection.fragments', { n: fragments })}</div>}
                {canEvolve && <motion.div className="absolute -top-1 -right-1 text-sm z-30" animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>🧬</motion.div>}
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Card detail modal */}
      <AnimatePresence>
        {selectedCard && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { if (!evolving) setSelectedCard(null) }}
          >
            <motion.div
              className="bg-gray-900 rounded-2xl p-6 mx-4 max-w-md w-full border border-gray-700 max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              onClick={e => e.stopPropagation()}
            >
              {/* 进化动画覆盖层 */}
              <AnimatePresence>
                {evolving && (
                  <motion.div
                    className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {/* 闪光背景 */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-amber-300 to-orange-500"
                      animate={{
                        opacity: [0, 1, 1, 0.8, 0],
                        scale: [0.5, 1.2, 1, 1.1, 1],
                      }}
                      transition={{ duration: 1.4, times: [0, 0.3, 0.5, 0.7, 1] }}
                    />
                    {/* 中心光芒 */}
                    <motion.div
                      className="absolute w-24 h-24 rounded-full"
                      style={{
                        background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,215,0,0.8) 40%, transparent 70%)',
                      }}
                      animate={{
                        scale: [0, 3, 5],
                        opacity: [1, 0.8, 0],
                      }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                    />
                    {/* 进化文字 */}
                    <motion.div
                      className="relative text-3xl font-black text-white z-10"
                      style={{ textShadow: '0 0 20px rgba(255,215,0,0.8), 0 0 40px rgba(255,165,0,0.5)' }}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 1] }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                    >
                      {t('collection.detail.evoSuccess')}
                    </motion.div>
                    {/* 粒子效果（CSS 模拟） */}
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-2 h-2 rounded-full bg-yellow-300"
                        initial={{ x: 0, y: 0, opacity: 1 }}
                        animate={{
                          x: Math.cos(i * Math.PI / 4) * 120,
                          y: Math.sin(i * Math.PI / 4) * 120,
                          opacity: 0,
                          scale: [1, 0.5],
                        }}
                        transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-center mb-4">
                <motion.div
                  animate={evolving ? {
                    scale: [1, 1.2, 0.8, 1.1, 1],
                    rotate: [0, 5, -5, 3, 0],
                    filter: ['brightness(1)', 'brightness(2)', 'brightness(3)', 'brightness(1.5)', 'brightness(1)'],
                  } : {}}
                  transition={{ duration: 1.2 }}
                >
                  <BattleCard
                    card={selectedCard}
                    hp={selectedCard.hp || 0}
                    maxHp={selectedCard.hp || 1}
                    isPlayer={true}
                    isActive={false}
                  />
                </motion.div>
              </div>
              <h3 className="text-lg font-bold text-white text-center mb-1">{cardName(selectedCard)}</h3>
              <p className="text-xs text-gray-500 text-center mb-3">{lang === 'en' ? selectedCard.name : selectedCard.nameEn}</p>

              {/* Stats */}
              <div className="flex justify-center gap-4 text-sm mb-3">
                {selectedCard.atk != null && <span className="text-red-400">⚔️ {selectedCard.atk}</span>}
                {selectedCard.hp != null && <span className="text-green-400">❤️ {selectedCard.hp}</span>}
                <span className="text-blue-400">{t('collection.detail.cost', { n: selectedCard.cost || selectedCard.spCost })}</span>
              </div>

              {/* Skills */}
              {selectedCard.skills?.length > 0 && (
                <div className="mb-3">
                  {selectedCard.skills.map((s, i) => (
                    <div key={i} className="text-xs text-gray-300 mb-1">
                      <span className="text-yellow-400 font-bold">{skillName(s)}</span>
                      <span className="text-gray-500 ml-1">— {s.description}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Event effect */}
              {selectedCard.effectDescription && (
                <div className="text-xs text-emerald-300 mb-3">
                  📜 {selectedCard.effectDescription}
                </div>
              )}

              {/* Science card */}
              <div className="bg-gray-800/80 rounded-xl p-3 text-xs text-gray-400 leading-relaxed mb-3">
                📖 {selectedCard.scienceCard} {t('science.chineseOnly')}
              </div>

              {/* 进化链可视化 */}
              {selectedChain && (
                <div className="bg-gray-800/50 rounded-xl p-3 mb-3 border border-amber-500/20">
                  <div className="text-xs font-bold text-amber-400 mb-2">🧬 {selectedChain.name}</div>
                  <div className="flex items-center justify-center gap-2">
                    {selectedChain.steps.map((step, i) => {
                      const card = cardMap[step.cardId]
                      const isOwned = owned.includes(step.cardId)
                      const isCurrent = step.cardId === selectedCard.id
                      const evo = getEvolutionTarget(step.cardId)
                      return (
                        <React.Fragment key={step.cardId}>
                          <div
                            className={`flex flex-col items-center px-2 py-1 rounded-lg transition-all
                              ${isCurrent ? 'bg-amber-500/20 ring-1 ring-amber-400' : ''}
                              ${!isOwned ? 'opacity-40' : ''}
                              ${isOwned && !isCurrent ? 'cursor-pointer hover:bg-gray-700/50' : ''}
                            `}
                            onClick={() => {
                              if (isOwned && card && !isCurrent) setSelectedCard(card)
                            }}
                          >
                            <span className={`text-xs font-bold ${rarityLabel[step.rarity]}`}>
                              {card?.name?.split('·')[0] || '???'}
                            </span>
                            <span className="text-[9px] text-gray-500">{step.rarity}</span>
                            {isOwned ? (
                              <span className="text-[9px] text-green-400">✓</span>
                            ) : (
                              <span className="text-[9px] text-gray-600">🔒</span>
                            )}
                          </div>
                          {i < selectedChain.steps.length - 1 && (
                            <div className="flex flex-col items-center">
                              <span className="text-amber-500 text-sm font-bold">→</span>
                              <span className="text-[8px] text-gray-500">
                                {evo ? t('collection.fragCost', { n: evo.fragmentCost }) : ''}
                              </span>
                            </div>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 进化按钮 */}
              {selectedEvoInfo && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                    <span>
                      碎片: <span className={selectedEvoInfo.canEvolve ? 'text-amber-400' : 'text-red-400'}>
                        {selectedEvoInfo.fragmentsHave}
                      </span>
                      /{selectedEvoInfo.fragmentsNeed}
                    </span>
                    <span className="text-gray-500">
                      {t('collection.detail.evolveTo')} <span className={rarityLabel[selectedEvoInfo.target.targetRarity]}>
                        {cardName(cardMap[selectedEvoInfo.target.targetCardId]) || selectedEvoInfo.target.targetCardId}
                      </span>
                    </span>
                  </div>
                  {/* 碎片进度条 */}
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
                    <motion.div
                      className={`h-full rounded-full ${selectedEvoInfo.canEvolve
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                        : 'bg-gradient-to-r from-gray-600 to-gray-500'
                      }`}
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(100, (selectedEvoInfo.fragmentsHave / selectedEvoInfo.fragmentsNeed) * 100)}%`
                      }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <motion.button
                    className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all
                      ${selectedEvoInfo.canEvolve && !evolving
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black hover:from-amber-400 hover:to-yellow-300 shadow-lg shadow-amber-500/30'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      }
                    `}
                    whileHover={selectedEvoInfo.canEvolve && !evolving ? { scale: 1.02 } : {}}
                    whileTap={selectedEvoInfo.canEvolve && !evolving ? { scale: 0.98 } : {}}
                    onClick={() => {
                      if (selectedEvoInfo.canEvolve && !evolving) {
                        handleEvolve(selectedCard.id)
                      }
                    }}
                    disabled={!selectedEvoInfo.canEvolve || evolving}
                  >
                    {evolving ? t('collection.detail.evolving') : selectedEvoInfo.canEvolve
                      ? t('collection.detail.evolveBtn', { n: selectedEvoInfo.fragmentsNeed })
                      : t('collection.detail.evolveInsufficient', { have: selectedEvoInfo.fragmentsHave, need: selectedEvoInfo.fragmentsNeed })
                    }
                  </motion.button>
                </div>
              )}

              <button
                className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300"
                onClick={() => { if (!evolving) setSelectedCard(null) }}
                disabled={evolving}
              >
                {t('collection.detail.close')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
