import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BattleCard from './Card'
import cards from '../data/cards'
import eventCards from '../data/eventCards'
import spCards from '../data/spCards'
import { FACTIONS, DECK_SIZE, SP_DECK_SIZE, MAX_SAME_CARD, MAX_SAME_SP } from '../data/deckRules'

const STORAGE_KEY = 'bio-heroes-decks'
const MAX_SLOTS = 3

// All available cards
const allMainCards = [...cards, ...eventCards]
const allSpCards = spCards

// Load saved decks from localStorage
function loadDecks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) { /* ignore */ }
  return [null, null, null]
}

function saveDecks(decks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decks))
}

// Generate a recommended deck
function generateRecommendedDeck(factionPrimary = 'body', factionSecondary = 'tech') {
  const main = []
  // Pick cards from primary + secondary factions, sorted by cost
  const pool = allMainCards
    .filter(c => c.faction === factionPrimary || c.faction === factionSecondary)
    .sort((a, b) => a.cost - b.cost)

  // Build a balanced curve: lots of low-cost, some mid, few high
  const costTargets = { 1: 6, 2: 6, 3: 5, 4: 4, 5: 2 }
  for (const [cost, count] of Object.entries(costTargets)) {
    const candidates = pool.filter(c => c.cost === Number(cost) && main.filter(m => m.id === c.id).length < MAX_SAME_CARD)
    for (let i = 0; i < count && candidates.length > 0 && main.length < DECK_SIZE; i++) {
      const pick = candidates[i % candidates.length]
      if (pick) main.push(pick)
    }
  }
  // Fill remaining with lowest-cost available
  while (main.length < DECK_SIZE) {
    const fill = pool.find(c => main.filter(m => m.id === c.id).length < MAX_SAME_CARD)
    if (!fill) break
    main.push(fill)
  }

  // SP deck: pick from matching factions
  const sp = allSpCards
    .filter(c => c.faction === factionPrimary || c.faction === factionSecondary)
    .slice(0, Math.min(3, SP_DECK_SIZE))

  return { main: main.map(c => c.id), sp: sp.map(c => c.id) }
}

export default function DeckBuilder({ onBack, onSelectDeck }) {
  const [deckSlots, setDeckSlots] = useState(() => loadDecks())
  const [activeSlot, setActiveSlot] = useState(0)
  const [editing, setEditing] = useState(false)

  // Current deck being edited
  const [mainDeck, setMainDeck] = useState([]) // array of card ids
  const [spDeck, setSpDeck] = useState([])     // array of sp card ids

  // Filters
  const [filterFaction, setFilterFaction] = useState('all')
  const [filterType, setFilterType] = useState('all') // all | character | event
  const [filterRarity, setFilterRarity] = useState('all')
  const [sortBy, setSortBy] = useState('cost') // cost | atk | rarity
  const [showSp, setShowSp] = useState(false)

  // Load deck from slot
  const loadSlot = useCallback((slotIdx) => {
    setActiveSlot(slotIdx)
    const slot = deckSlots[slotIdx]
    if (slot) {
      setMainDeck(slot.main || [])
      setSpDeck(slot.sp || [])
    } else {
      setMainDeck([])
      setSpDeck([])
    }
    setEditing(true)
  }, [deckSlots])

  // Save current deck to slot
  const saveToSlot = useCallback(() => {
    if (mainDeck.length !== DECK_SIZE) return
    const newSlots = [...deckSlots]
    newSlots[activeSlot] = { main: mainDeck, sp: spDeck, savedAt: Date.now() }
    setDeckSlots(newSlots)
    saveDecks(newSlots)
    setEditing(false)
  }, [mainDeck, spDeck, activeSlot, deckSlots])

  // Add card to deck
  const addCard = useCallback((cardId) => {
    if (showSp) {
      if (spDeck.length >= SP_DECK_SIZE) return
      const count = spDeck.filter(id => id === cardId).length
      if (count >= MAX_SAME_SP) return
      setSpDeck(prev => [...prev, cardId])
    } else {
      if (mainDeck.length >= DECK_SIZE) return
      const count = mainDeck.filter(id => id === cardId).length
      if (count >= MAX_SAME_CARD) return
      setMainDeck(prev => [...prev, cardId])
    }
  }, [showSp, mainDeck, spDeck])

  // Remove card from deck (by index)
  const removeCard = useCallback((idx, isSp = false) => {
    if (isSp) {
      setSpDeck(prev => [...prev.slice(0, idx), ...prev.slice(idx + 1)])
    } else {
      setMainDeck(prev => [...prev.slice(0, idx), ...prev.slice(idx + 1)])
    }
  }, [])

  // Apply recommended deck
  const applyRecommended = useCallback((primary, secondary) => {
    const rec = generateRecommendedDeck(primary, secondary)
    setMainDeck(rec.main)
    setSpDeck(rec.sp)
  }, [])

  // Filtered + sorted card pool
  const filteredCards = useMemo(() => {
    const pool = showSp ? allSpCards : allMainCards
    let filtered = pool

    if (filterFaction !== 'all') {
      filtered = filtered.filter(c => c.faction === filterFaction)
    }
    if (!showSp && filterType !== 'all') {
      filtered = filtered.filter(c => c.type === filterType)
    }
    if (filterRarity !== 'all') {
      filtered = filtered.filter(c => c.rarity === filterRarity)
    }

    // Sort
    if (sortBy === 'cost') {
      filtered = [...filtered].sort((a, b) => (a.cost || a.spCost || 0) - (b.cost || b.spCost || 0))
    } else if (sortBy === 'atk') {
      filtered = [...filtered].sort((a, b) => (b.atk || 0) - (a.atk || 0))
    } else if (sortBy === 'rarity') {
      const order = { SSR: 0, SR: 1, R: 2 }
      filtered = [...filtered].sort((a, b) => order[a.rarity] - order[b.rarity])
    }

    return filtered
  }, [showSp, filterFaction, filterType, filterRarity, sortBy])

  // Cost curve data
  const costCurve = useMemo(() => {
    const curve = {}
    mainDeck.forEach(id => {
      const card = allMainCards.find(c => c.id === id)
      if (card) {
        const cost = card.cost
        curve[cost] = (curve[cost] || 0) + 1
      }
    })
    return curve
  }, [mainDeck])

  // Faction distribution
  const factionDist = useMemo(() => {
    const dist = { nature: 0, body: 0, pathogen: 0, tech: 0 }
    mainDeck.forEach(id => {
      const card = allMainCards.find(c => c.id === id)
      if (card) dist[card.faction] = (dist[card.faction] || 0) + 1
    })
    return dist
  }, [mainDeck])

  // Resolve card id to card object
  const resolveCard = useCallback((id, isSp = false) => {
    if (isSp) return allSpCards.find(c => c.id === id)
    return allMainCards.find(c => c.id === id)
  }, [])

  // Can the deck be used for battle?
  const deckReady = mainDeck.length === DECK_SIZE

  // Select this deck for battle
  const handleSelectForBattle = useCallback((slotIdx) => {
    const slot = deckSlots[slotIdx]
    if (!slot) return
    const mainCards = slot.main.map(id => allMainCards.find(c => c.id === id)).filter(Boolean)
    const spCardsResolved = slot.sp.map(id => allSpCards.find(c => c.id === id)).filter(Boolean)
    onSelectDeck({ mainCards, spCards: spCardsResolved })
  }, [deckSlots, onSelectDeck])

  // === Slot overview (not editing) ===
  if (!editing) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-6 min-h-screen">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-yellow-400">🃏 卡组管理</h1>
          <button
            className="text-sm px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg"
            onClick={onBack}
          >
            ← 返回
          </button>
        </div>

        <div className="space-y-4">
          {deckSlots.map((slot, i) => (
            <motion.div
              key={i}
              className={`p-4 rounded-xl border-2 ${slot ? 'border-blue-500/50 bg-gray-800/80' : 'border-gray-700 bg-gray-800/40 border-dashed'}`}
              whileHover={{ scale: 1.01 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-lg font-bold text-white">卡组 {i + 1}</span>
                  {slot ? (
                    <span className="text-xs text-gray-400 ml-3">
                      {slot.main.length}/{DECK_SIZE} 主卡 | {slot.sp.length} SP
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500 ml-3">空卡组</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold"
                    onClick={() => loadSlot(i)}
                  >
                    {slot ? '✏️ 编辑' : '➕ 新建'}
                  </button>
                  {slot && slot.main.length === DECK_SIZE && (
                    <button
                      className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold"
                      onClick={() => handleSelectForBattle(i)}
                    >
                      ⚔️ 出战
                    </button>
                  )}
                </div>
              </div>
              {/* Faction distribution mini bar */}
              {slot && (
                <div className="flex gap-1 mt-2 h-2 rounded-full overflow-hidden bg-gray-700">
                  {Object.entries(FACTIONS).map(([key, f]) => {
                    const count = slot.main.filter(id => {
                      const card = allMainCards.find(c => c.id === id)
                      return card?.faction === key
                    }).length
                    if (count === 0) return null
                    return (
                      <div
                        key={key}
                        style={{ width: `${(count / slot.main.length) * 100}%`, background: f.color }}
                        title={`${f.icon} ${f.name}: ${count}`}
                      />
                    )
                  })}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Quick start with test deck */}
        <div className="mt-6 text-center">
          <button
            className="text-xs text-gray-500 hover:text-gray-300"
            onClick={() => {
              onSelectDeck(null) // use default test deck
            }}
          >
            使用默认测试卡组开始战斗
          </button>
        </div>
      </div>
    )
  }

  // === Deck editor ===
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4 min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <button
            className="text-sm px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
            onClick={() => setEditing(false)}
          >
            ← 返回
          </button>
          <h2 className="text-lg font-bold text-white">卡组 {activeSlot + 1} 编辑</h2>
        </div>
        <div className="flex gap-2">
          <span className={`text-sm font-bold ${mainDeck.length === DECK_SIZE ? 'text-green-400' : 'text-yellow-400'}`}>
            主卡 {mainDeck.length}/{DECK_SIZE}
          </span>
          <span className={`text-sm font-bold ${spDeck.length <= SP_DECK_SIZE ? 'text-blue-400' : 'text-red-400'}`}>
            SP {spDeck.length}/{SP_DECK_SIZE}
          </span>
          <button
            className={`text-sm px-3 py-1 rounded font-bold ${
              deckReady ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
            onClick={deckReady ? saveToSlot : undefined}
          >
            💾 保存
          </button>
        </div>
      </div>

      {/* Current deck display */}
      <div className="bg-gray-800/60 rounded-xl p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">当前卡组</span>
          <div className="flex gap-2">
            {/* Cost curve mini */}
            <div className="flex items-end gap-0.5 h-5">
              {[1, 2, 3, 4, 5].map(cost => {
                const count = costCurve[cost] || 0
                const maxH = 20
                const h = count > 0 ? Math.max(4, (count / 8) * maxH) : 0
                return (
                  <div key={cost} className="flex flex-col items-center">
                    <div
                      className="w-3 bg-blue-400 rounded-t"
                      style={{ height: `${h}px` }}
                      title={`费用${cost}: ${count}张`}
                    />
                    <span className="text-[8px] text-gray-500">{cost}</span>
                  </div>
                )
              })}
            </div>
            {/* Faction distribution */}
            <div className="flex gap-1 items-center">
              {Object.entries(FACTIONS).map(([key, f]) => {
                const count = factionDist[key] || 0
                if (count === 0) return null
                return (
                  <span key={key} className="text-[10px]" style={{ color: f.color }}>
                    {f.icon}{count}
                  </span>
                )
              })}
            </div>
          </div>
        </div>

        {/* Deck cards (compact list) */}
        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
          {mainDeck.map((id, i) => {
            const card = resolveCard(id)
            if (!card) return null
            const faction = FACTIONS[card.faction]
            return (
              <motion.div
                key={`${id}_${i}`}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] cursor-pointer hover:opacity-70"
                style={{ background: `${faction?.color}22`, border: `1px solid ${faction?.color}44` }}
                onClick={() => removeCard(i)}
                title="点击移除"
                whileTap={{ scale: 0.9 }}
              >
                <span>{faction?.icon}</span>
                <span className="text-white truncate max-w-[60px]">{card.name.split('·')[0]}</span>
                <span className="text-gray-400">({card.cost})</span>
              </motion.div>
            )
          })}
          {mainDeck.length === 0 && <span className="text-gray-600 text-xs">从下方选卡添加到卡组</span>}
        </div>

        {/* SP deck */}
        {spDeck.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-700">
            <span className="text-[10px] text-yellow-400 mr-1">SP:</span>
            {spDeck.map((id, i) => {
              const card = resolveCard(id, true)
              if (!card) return null
              return (
                <motion.div
                  key={`sp_${id}_${i}`}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] cursor-pointer hover:opacity-70 bg-yellow-500/10 border border-yellow-500/30"
                  onClick={() => removeCard(i, true)}
                  whileTap={{ scale: 0.9 }}
                >
                  <span>🌟</span>
                  <span className="text-yellow-200 truncate max-w-[70px]">{card.name.split('·')[1] || card.name}</span>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Filters + recommended */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {/* Main / SP toggle */}
        <div className="flex bg-gray-800 rounded-lg overflow-hidden">
          <button
            className={`px-3 py-1 text-xs font-bold ${!showSp ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
            onClick={() => setShowSp(false)}
          >
            主卡({allMainCards.length})
          </button>
          <button
            className={`px-3 py-1 text-xs font-bold ${showSp ? 'bg-yellow-600 text-white' : 'text-gray-400'}`}
            onClick={() => setShowSp(true)}
          >
            SP卡({allSpCards.length})
          </button>
        </div>

        {/* Faction filter */}
        <select
          className="bg-gray-800 text-xs text-gray-300 rounded px-2 py-1 border border-gray-700"
          value={filterFaction}
          onChange={e => setFilterFaction(e.target.value)}
        >
          <option value="all">全部阵营</option>
          {Object.entries(FACTIONS).map(([key, f]) => (
            <option key={key} value={key}>{f.icon} {f.name}</option>
          ))}
        </select>

        {/* Type filter (main cards only) */}
        {!showSp && (
          <select
            className="bg-gray-800 text-xs text-gray-300 rounded px-2 py-1 border border-gray-700"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="all">全部类型</option>
            <option value="character">🃏 生物卡</option>
            <option value="event">📜 事件卡</option>
          </select>
        )}

        {/* Rarity filter */}
        <select
          className="bg-gray-800 text-xs text-gray-300 rounded px-2 py-1 border border-gray-700"
          value={filterRarity}
          onChange={e => setFilterRarity(e.target.value)}
        >
          <option value="all">全部稀有度</option>
          <option value="R">R</option>
          <option value="SR">SR</option>
          <option value="SSR">SSR</option>
        </select>

        {/* Sort */}
        <select
          className="bg-gray-800 text-xs text-gray-300 rounded px-2 py-1 border border-gray-700"
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
        >
          <option value="cost">按费用</option>
          <option value="atk">按攻击力</option>
          <option value="rarity">按稀有度</option>
        </select>

        {/* Recommended decks */}
        <div className="flex gap-1 ml-auto">
          <button
            className="text-[10px] px-2 py-1 bg-blue-700 hover:bg-blue-600 text-white rounded font-bold"
            onClick={() => applyRecommended('body', 'tech')}
            title="人体+科技"
          >
            🧬⚗️ 推荐
          </button>
          <button
            className="text-[10px] px-2 py-1 bg-green-700 hover:bg-green-600 text-white rounded font-bold"
            onClick={() => applyRecommended('nature', 'pathogen')}
            title="自然+病原"
          >
            🌱🦠 推荐
          </button>
        </div>
      </div>

      {/* Card pool */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 pb-4">
          {filteredCards.map((card) => {
            const currentCount = showSp
              ? spDeck.filter(id => id === card.id).length
              : mainDeck.filter(id => id === card.id).length
            const maxCount = showSp ? MAX_SAME_SP : MAX_SAME_CARD
            const atLimit = currentCount >= maxCount
            const deckFull = showSp ? spDeck.length >= SP_DECK_SIZE : mainDeck.length >= DECK_SIZE

            return (
              <motion.div
                key={card.id}
                className={`relative cursor-pointer ${atLimit || deckFull ? 'opacity-40' : ''}`}
                whileHover={!atLimit && !deckFull ? { scale: 1.05 } : {}}
                whileTap={!atLimit && !deckFull ? { scale: 0.95 } : {}}
                onClick={() => !atLimit && !deckFull && addCard(card.id)}
              >
                <BattleCard card={card} hp={card.hp || 0} maxHp={card.hp || 1} isPlayer={true} isActive={false} />
                {currentCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 text-white text-[10px] font-black flex items-center justify-center">
                    ×{currentCount}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
