import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BattleCard from './Card'
import { FACTIONS, SUBTYPES } from '../data/deckRules'
import { DEX_SETS, setOf, ALL_DEX_CARDS, TOTAL_DEX_CARDS, ownedDexCount } from '../data/dexSets'
import { EVOLUTION_CHAINS, getEvolutionTarget, getChainForCard } from '../data/evolutions'
import { COLLECTION_ACHIEVEMENTS, BATTLE_ACHIEVEMENTS, QUIZ_ACHIEVEMENTS, detectNewlyUnlocked } from '../data/achievements'
import { loadCampaignProgress } from '../data/campaignData'
import { getReviewStats } from '../data/quizzes'
import AchievementModal from './AchievementModal'
import CardDetailModal from './CardDetailModal'
import { useLanguage } from '../i18n/LanguageContext'

const allCards = ALL_DEX_CARDS
const TOTAL_CARDS = TOTAL_DEX_CARDS
const cardMap = Object.fromEntries(allCards.map(c => [c.id, c]))

// 稀有度颜色
const rarityLabel = { R: 'text-blue-400', SR: 'text-purple-400', SSR: 'text-yellow-400' }

export default function Collection({ onBack, economy }) {
  const { t, lang, cardName, skillName, localName } = useLanguage()
  const [filterFaction, setFilterFaction] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [filterSet, setFilterSet] = useState('all')
  const [selectedCard, setSelectedCard] = useState(null)
  const [showEvolutionChain, setShowEvolutionChain] = useState(null) // chain id
  const [evolving, setEvolving] = useState(false) // 进化动画中
  const [sellAmount, setSellAmount] = useState(1)
  const [achievementDetail, setAchievementDetail] = useState(null)
  const [unlockedQueue, setUnlockedQueue] = useState([]) // 进化补齐收集成就 → 当场弹窗队列

  const owned = economy.collection // { cardId: count } map
  const isOwn = (id) => !!owned[id]
  const ownedCount = ownedDexCount(owned)
  const progress = Math.round((ownedCount / TOTAL_CARDS) * 100)
  // 🧠 知识复习进度（Leitner）—— 进屏时算一次（答题在战斗里发生，Collection 每次重进都新鲜）
  const reviewStats = useMemo(() => getReviewStats(), [])
  const masteredPct = reviewStats.total ? Math.round((reviewStats.mastered / reviewStats.total) * 100) : 0

  // 成就展示用 ctx（战役进度只读一次；战斗/答题成就靠 economy 累计计数器算进度）
  const stageStars = useMemo(() => loadCampaignProgress().stageStars || {}, [])
  const achCtx = useMemo(() => ({
    collection: owned,
    stageStars,
    stats: {
      battlesWon: economy.battlesWon ?? 0,
      battlesTotal: economy.battlesTotal ?? 0,
      quizCorrectTotal: economy.quizCorrectTotal ?? 0,
      quizTotalAnswered: economy.quizTotalAnswered ?? 0,
    },
    battleResult: { won: false, leaderHPPercent: 0, quizCorrect: 0, quizTotal: 0 }, // 展示用惰性占位
  }), [owned, stageStars, economy.battlesWon, economy.battlesTotal, economy.quizCorrectTotal, economy.quizTotalAnswered])

  const filtered = useMemo(() => {
    let pool = allCards
    if (filterFaction !== 'all') pool = pool.filter(c => c.faction === filterFaction)
    if (filterType !== 'all') pool = pool.filter(c => c.type === filterType)
    if (filterSet !== 'all') pool = pool.filter(c => setOf(c) === filterSet)
    // Sort: owned first, then by cost
    return pool.sort((a, b) => {
      const aOwned = isOwn(a.id) ? 0 : 1
      const bOwned = isOwn(b.id) ? 0 : 1
      if (aOwned !== bOwned) return aOwned - bOwned
      return (a.cost || a.spCost || 0) - (b.cost || b.spCost || 0)
    })
  }, [filterFaction, filterType, filterSet, owned])

  // Faction stats
  const factionStats = useMemo(() => {
    const stats = {}
    for (const [key] of Object.entries(FACTIONS)) {
      const total = allCards.filter(c => c.faction === key).length
      const have = allCards.filter(c => c.faction === key && isOwn(c.id)).length
      stats[key] = { total, have }
    }
    return stats
  }, [owned])

  // 图鉴包（dex set）完成度 — 决策4
  const setStats = useMemo(() => {
    const stats = {}
    for (const s of DEX_SETS) {
      const inSet = allCards.filter(c => setOf(c) === s.id)
      stats[s.id] = { total: inSet.length, have: inSet.filter(c => isOwn(c.id)).length }
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

  // 进化补齐收集成就 → 当场检测解锁（不然要等下次进抽卡屏抽一次卡才补检测，徽章 3/3 却灰着、领不到科学包）。
  // 挂在 collection 变化上而非 handleEvolve 内联：evolveCard 是 setState、同一 tick 读 economy.collection 是旧值；
  // 且进页面时会一次性补检测过去被静默漏掉的进化成就（自愈）。markAchievementsUnlocked 只改 unlockedAchievements
  // 不改 collection，故不会自触发死循环。
  useEffect(() => {
    const newly = detectNewlyUnlocked(economy.collection, economy.unlockedAchievements)
    if (newly.length > 0) {
      economy.markAchievementsUnlocked(newly.map(a => a.id))
      setUnlockedQueue(q => [...q, ...newly])
    }
  }, [economy.collection]) // eslint-disable-line react-hooks/exhaustive-deps

  // 获取选中卡的进化信息
  const selectedEvoInfo = selectedCard ? economy.checkEvolution(selectedCard.id) : null
  const selectedChain = selectedCard ? getChainForCard(selectedCard.id) : null

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black text-yellow-400">{t('collection.title')}</h1>
        <div className="flex items-center gap-2">
          <button
            className="text-xs px-3 py-1.5 bg-yellow-600/80 hover:bg-yellow-500 text-white rounded-lg font-bold"
            onClick={() => {
              const fragMap = economy.fragments
              let total = 0
              for (const id of Object.keys(fragMap)) {
                if (!getEvolutionTarget(id)) total += fragMap[id] * economy.FRAGMENT_TO_COIN_RATE
              }
              if (total === 0) {
                alert(t('collection.noSellable'))
                return
              }
              if (confirm(t('collection.sellAllConfirm', { total }))) {
                economy.sellAllUnusedFragments()
              }
            }}
            title={t('collection.sellAllTitle')}
          >
            {t('collection.sellButton')}
          </button>
          <button
            className="text-sm px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg"
            onClick={onBack}
          >
            {t('collection.back')}
          </button>
        </div>
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

      {/* 🧠 知识复习进度 — Leitner 间隔复习：已掌握 X/总数 + 今日待复习 */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-400">🧠 {lang === 'en' ? 'Knowledge Review' : '知识复习'}</span>
          <span className="text-cyan-400 font-bold">
            {lang === 'en' ? 'Mastered' : '已掌握'} {reviewStats.mastered}/{reviewStats.total}
            {reviewStats.dueToday > 0 && (
              <span className="text-amber-400 ml-2">· {lang === 'en' ? 'Due today' : '今日待复习'} {reviewStats.dueToday}</span>
            )}
          </span>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${masteredPct}%` }}
            transition={{ duration: 0.8 }}
          />
        </div>
      </div>

      {/* 图鉴包进度 — dex 分包追踪 + 预存起点（决策4） */}
      <div className="mb-4">
        <div className="text-xs text-gray-300 mb-2">{t('collection.dexPacks')}</div>
        <div className="flex flex-col gap-2">
          {DEX_SETS.map(s => {
            const st = setStats[s.id]
            if (!st || st.total === 0) return null
            const ownedPct = (st.have / st.total) * 100
            const ghostPct = Math.min(100, (s.endowed / st.total) * 100)
            const done = st.have >= st.total
            const active = filterSet === s.id
            const rewardAch = s.rewardAchId ? COLLECTION_ACHIEVEMENTS.find(a => a.id === s.rewardAchId) : null
            return (
              <button
                key={s.id}
                onClick={() => setFilterSet(active ? 'all' : s.id)}
                className={`w-full text-left rounded-xl p-2.5 border transition ${active ? 'border-yellow-500/70 bg-gray-800/70' : 'border-gray-700 bg-gray-800/40 hover:border-gray-600'}`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-lg">{s.icon}</span>
                  <span className="text-xs font-bold" style={{ color: s.color }}>{lang === 'en' ? s.nameEn : s.name}</span>
                  {s.season && <span className="text-[9px] text-gray-400 px-1 rounded bg-gray-700/60">{s.season}</span>}
                  <span className="text-[11px] ml-auto font-bold" style={{ color: done ? '#4ADE80' : '#cbd5e1' }}>
                    {done ? t('collection.packComplete') : `${st.have}/${st.total}`}
                  </span>
                </div>
                <div className="h-2.5 bg-gray-900 rounded-full overflow-hidden relative">
                  {ghostPct > ownedPct && (
                    <div className="absolute inset-y-0 left-0 rounded-full opacity-25" style={{ width: `${ghostPct}%`, background: s.color }} />
                  )}
                  <motion.div
                    className="h-full rounded-full relative"
                    style={{ background: s.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${ownedPct}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1 min-h-[12px]">
                  <span className="text-[9px] text-gray-500">
                    {done ? '' : (s.endowed > 0 && st.have < s.endowed ? t('collection.endowedHint') : t('collection.achLockedTip', { n: st.total - st.have }))}
                  </span>
                  {rewardAch && !done && (
                    <span className="text-[9px] text-amber-400/80 truncate ml-2">{t('collection.unlockReward', { r: rewardAch.name })}</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 成就进度栏 — 三类：收集 / 战斗 / 答题 */}
      {(() => {
        const unlockedList = economy.unlockedAchievements || []
        const badge = (ach) => {
          const unlocked = unlockedList.includes(ach.id)
          const p = ach.progress ? ach.progress(achCtx) : null
          const countLabel = p ? `${p.have}/${p.total}` : (unlocked ? '✓' : '🔒')
          const lockTip = (ach.category === 'collection' && p)
            ? t('collection.achLockedTip', { n: Math.max(p.total - p.have, 0) })
            : t('collection.achLockedGeneric')
          return (
            <button
              key={ach.id}
              onClick={() => unlocked && setAchievementDetail(ach)}
              disabled={!unlocked}
              className={`rounded-lg p-2 text-center transition ${
                unlocked
                  ? 'bg-yellow-600/30 border border-yellow-500/60 hover:bg-yellow-600/50 cursor-pointer'
                  : 'bg-gray-700/40 border border-gray-700 cursor-default'
              }`}
              title={unlocked ? t('collection.achUnlockedTip') : lockTip}
            >
              <div className={`text-2xl ${unlocked ? '' : 'grayscale opacity-40'}`}>{ach.icon}</div>
              <div className={`text-[10px] truncate ${unlocked ? 'text-yellow-100' : 'text-gray-400'}`}>{ach.name}</div>
              <div className="text-[10px] text-gray-400">{countLabel}</div>
            </button>
          )
        }
        const section = (labelKey, list) => (
          <div className="bg-gray-800/40 rounded-xl p-3 mb-4">
            <div className="text-xs text-gray-300 mb-2">{t(labelKey)}</div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {list.map(badge)}
            </div>
          </div>
        )
        return (
          <>
            {section('collection.achievements', COLLECTION_ACHIEVEMENTS)}
            {section('collection.battleAchievements', BATTLE_ACHIEVEMENTS)}
            {section('collection.quizAchievements', QUIZ_ACHIEVEMENTS)}
          </>
        )
      })()}

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
                    const isOwned = isOwn(step.cardId)
                    return (
                      <React.Fragment key={step.cardId}>
                        <span className={`${isOwned ? rarityLabel[step.rarity] : 'text-gray-600'} font-bold`}>
                          {(card ? cardName(card) : '')?.split('·')[0] || step.cardId}
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
                          const isOwned = isOwn(step.cardId)
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
                <h3 className="text-xs font-bold text-gray-400 mb-2 border-b border-gray-700 pb-1">{localName(st)}</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {groupCards.map(card => {
                    const isOwned = isOwn(card.id)
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
                        {isOwned && (
                          <div className={`absolute top-1 left-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full z-20 ${owned[card.id] >= economy.MAX_COPIES_PER_CARD ? 'bg-green-600 text-white' : 'bg-gray-900/80 text-white'}`}>
                            ×{owned[card.id]}{owned[card.id] >= economy.MAX_COPIES_PER_CARD && ' ✓'}
                          </div>
                        )}
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
                    const isOwned = isOwn(card.id)
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
                        {isOwned && (
                          <div className={`absolute top-1 left-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full z-20 ${owned[card.id] >= economy.MAX_COPIES_PER_CARD ? 'bg-green-600 text-white' : 'bg-gray-900/80 text-white'}`}>
                            ×{owned[card.id]}{owned[card.id] >= economy.MAX_COPIES_PER_CARD && ' ✓'}
                          </div>
                        )}
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
            const isOwned = isOwn(card.id)
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
                {isOwned && (
                  <div className={`absolute top-1 left-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full z-20 ${owned[card.id] >= economy.MAX_COPIES_PER_CARD ? 'bg-green-600 text-white' : 'bg-gray-900/80 text-white'}`}>
                    ×{owned[card.id]}{owned[card.id] >= economy.MAX_COPIES_PER_CARD && ' ✓'}
                  </div>
                )}
                {isOwned && fragments > 0 && <div className="absolute bottom-1 right-1 text-[9px] bg-gray-900/80 text-amber-400 px-1 rounded">{t('collection.fragments', { n: fragments })}</div>}
                {canEvolve && <motion.div className="absolute -top-1 -right-1 text-sm z-30" animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>🧬</motion.div>}
              </motion.div>
            )
          })}
        </div>
      )}

      {/* 成就详情弹窗（已解锁的可点开重读知识包） */}
      {/* 进化补齐收集成就的解锁弹窗（依次出队）；与"点徽章看详情"的 achievementDetail 互斥不叠 */}
      {unlockedQueue.length > 0 && !achievementDetail && (
        <AchievementModal achievement={unlockedQueue[0]} onClose={() => setUnlockedQueue(q => q.slice(1))} />
      )}

      {achievementDetail && (
        <AchievementModal achievement={achievementDetail} onClose={() => setAchievementDetail(null)} />
      )}

      {/* 卡牌详情弹窗 — 通用 CardDetailModal + 图鉴专属：进化链/碎片商店/进化按钮 */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          context="collection"
          closeOnBackdrop={!evolving}
          onClose={() => { if (!evolving) setSelectedCard(null) }}
          cardAnimate={evolving ? {
            scale: [1, 1.2, 0.8, 1.1, 1],
            rotate: [0, 5, -5, 3, 0],
            filter: ['brightness(1)', 'brightness(2)', 'brightness(3)', 'brightness(1.5)', 'brightness(1)'],
          } : undefined}
          overlay={
            <AnimatePresence>
              {evolving && (
                <motion.div
                  className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl overflow-hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-amber-300 to-orange-500"
                    animate={{ opacity: [0, 1, 1, 0.8, 0], scale: [0.5, 1.2, 1, 1.1, 1] }}
                    transition={{ duration: 1.4, times: [0, 0.3, 0.5, 0.7, 1] }}
                  />
                  <motion.div
                    className="absolute w-24 h-24 rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,215,0,0.8) 40%, transparent 70%)' }}
                    animate={{ scale: [0, 3, 5], opacity: [1, 0.8, 0] }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                  />
                  <motion.div
                    className="relative text-3xl font-black text-white z-10"
                    style={{ textShadow: '0 0 20px rgba(255,215,0,0.8), 0 0 40px rgba(255,165,0,0.5)' }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 1] }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                  >
                    {t('collection.detail.evoSuccess')}
                  </motion.div>
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
          }
          actions={
            <button
              className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300 mt-1"
              onClick={() => { if (!evolving) setSelectedCard(null) }}
              disabled={evolving}
            >
              {t('collection.detail.close')}
            </button>
          }
        >
          {/* 进化链可视化 */}
          {selectedChain && (
            <div className="bg-gray-800/50 rounded-xl p-3 mb-3 border border-amber-500/20">
              <div className="text-xs font-bold text-amber-400 mb-2">🧬 {selectedChain.name}</div>
              <div className="flex items-center justify-center gap-2">
                {selectedChain.steps.map((step, i) => {
                  const card = cardMap[step.cardId]
                  const isOwned = isOwn(step.cardId)
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
                          {(card ? cardName(card) : '')?.split('·')[0] || '???'}
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

          {/* 持有数量 + 碎片商店 */}
          <div className="mb-3 bg-gray-800/40 rounded-lg p-2.5">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-gray-300">{t('collection.ownedCount')}</span>
              <span className="text-white font-bold">
                {owned[selectedCard.id] || 0} / {economy.MAX_COPIES_PER_CARD}
                {(owned[selectedCard.id] || 0) >= economy.MAX_COPIES_PER_CARD && (
                  <span className="ml-2 text-green-400 text-[10px]">{t('collection.complete')}</span>
                )}
              </span>
            </div>
            {(economy.fragments[selectedCard.id] || 0) > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] text-amber-400 shrink-0">{t('collection.fragLabel', { n: economy.fragments[selectedCard.id] })}</span>
                <input
                  type="number"
                  min={1}
                  max={economy.fragments[selectedCard.id]}
                  value={Math.min(sellAmount, economy.fragments[selectedCard.id])}
                  onChange={e => {
                    const v = parseInt(e.target.value, 10) || 1
                    setSellAmount(Math.max(1, Math.min(v, economy.fragments[selectedCard.id])))
                  }}
                  className="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white text-xs"
                />
                <button
                  onClick={() => {
                    const amt = Math.min(sellAmount, economy.fragments[selectedCard.id] || 0)
                    if (amt > 0) economy.sellFragments(selectedCard.id, amt)
                  }}
                  className="bg-yellow-600 hover:bg-yellow-500 px-2 py-1 rounded text-[11px] text-white font-bold whitespace-nowrap"
                >
                  {t('collection.sellTo', { n: Math.min(sellAmount, economy.fragments[selectedCard.id] || 0) * economy.FRAGMENT_TO_COIN_RATE })}
                </button>
              </div>
            )}
          </div>

          {/* 进化按钮 */}
          {selectedEvoInfo && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                <span>
                  {t('collection.fragColon')} <span className={selectedEvoInfo.canEvolve ? 'text-amber-400' : 'text-red-400'}>
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
        </CardDetailModal>
      )}

    </div>
  )
}
