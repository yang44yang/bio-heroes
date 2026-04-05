import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BattleCard from './Card'
import cards from '../data/cards'
import eventCards from '../data/eventCards'
import spCards from '../data/spCards'
import { FACTIONS, SUBTYPES, DECK_SIZE, SP_DECK_SIZE, MAX_SAME_CARD, MAX_SAME_SP } from '../data/deckRules'

const STORAGE_KEY = 'bio-heroes-decks'
const MAX_SLOTS = 3

// allMainCards 包含所有卡（用于 resolveCard / costCurve 等需要查找已入组卡牌的场景）
const allMainCards = [...cards, ...eventCards]
// 卡池显示只包含生物卡(character)，事件卡不能手动放入卡组
const selectableMainCards = cards.filter(c => c.type === 'character')
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

// Generate a recommended deck (from available cards pool)
function generateRecommendedDeck(factionPrimary, factionSecondary, mainPool, spPool) {
  const main = []
  const pool = mainPool
    .filter(c => c.faction === factionPrimary || c.faction === factionSecondary)
    .sort((a, b) => a.cost - b.cost)

  const costTargets = { 1: 6, 2: 6, 3: 5, 4: 4, 5: 2 }
  for (const [cost, count] of Object.entries(costTargets)) {
    const candidates = pool.filter(c => c.cost === Number(cost) && main.filter(m => m.id === c.id).length < MAX_SAME_CARD)
    for (let i = 0; i < count && candidates.length > 0 && main.length < DECK_SIZE; i++) {
      const pick = candidates[i % candidates.length]
      if (pick) main.push(pick)
    }
  }
  while (main.length < DECK_SIZE) {
    const fill = pool.find(c => main.filter(m => m.id === c.id).length < MAX_SAME_CARD)
    if (!fill) break
    main.push(fill)
  }

  const sp = spPool
    .filter(c => c.faction === factionPrimary || c.faction === factionSecondary)
    .slice(0, Math.min(3, SP_DECK_SIZE))

  return { main: main.map(c => c.id), sp: sp.map(c => c.id) }
}

// 技能类型 → 图标映射
const SKILL_ICONS = {
  '守护': '🛡️',
  'Guard': '🛡️',
  '迅击': '⚡',
  'Swift': '⚡',
  '穿透': '🗡️',
  'Piercing': '🗡️',
  '压制': '💪',
  'Overpower': '💪',
  '自愈': '💚',
  'Recovery': '💚',
}

function getSkillIcon(skillName) {
  for (const [key, icon] of Object.entries(SKILL_ICONS)) {
    if (skillName.includes(key)) return icon
  }
  return '🎯' // 专属技能默认图标
}

// 卡牌详情弹窗组件
function CardDetailModal({ card, onClose, onAdd, canAdd }) {
  if (!card) return null
  const faction = FACTIONS[card.faction]
  const rarityColors = { SSR: '#f1c40f', SR: '#9b59b6', R: '#3498db' }
  const borderColor = rarityColors[card.rarity] || '#3498db'

  return (
    <>
      {/* 背景遮罩 */}
      <motion.div
        className="fixed inset-0 z-[999]"
        style={{ background: 'rgba(0,0,0,0.6)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      {/* 弹窗本体 */}
      <motion.div
        className="fixed z-[1000] overflow-y-auto"
        style={{
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(90vw, 360px)',
          maxHeight: '80vh',
          background: '#1a1e2e',
          borderRadius: '12px',
          padding: '20px',
          border: `2px solid ${borderColor}`,
        }}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.85 }}
        transition={{ duration: 0.2 }}
      >
        {/* 卡名 */}
        <h3 className="text-lg font-black text-white mb-1">
          {faction?.icon} {card.name}
        </h3>
        {/* 阵营/子类型/稀有度/费用 */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-400 mb-3">
          <span style={{ color: faction?.color }}>{faction?.name}</span>
          {card.subType && <span>· {card.subType}</span>}
          <span
            className="font-bold px-1.5 py-0.5 rounded text-[10px]"
            style={{ background: `${borderColor}22`, color: borderColor }}
          >
            {card.rarity}
          </span>
          <span>⚡{card.cost ?? card.spCost ?? '?'}</span>
        </div>

        {/* ATK / HP */}
        {(card.atk != null || card.hp != null) && (
          <div className="flex gap-4 mb-3 text-sm font-bold">
            {card.atk != null && <span className="text-red-400">⚔️ {card.atk}</span>}
            {card.hp != null && <span className="text-green-400">❤️ {card.hp}</span>}
          </div>
        )}

        {/* 技能 */}
        {card.skills && card.skills.length > 0 && (
          <div className="mb-3">
            <div className="text-xs text-gray-500 font-bold mb-1.5 border-b border-gray-700 pb-1">── 技能 ──</div>
            {card.skills.map((skill, i) => (
              <div key={i} className="mb-2">
                <div className="text-sm font-bold text-white">
                  {getSkillIcon(skill.name)} {skill.name}
                  {skill.nameEn && <span className="text-gray-500 text-[10px] ml-1">({skill.nameEn})</span>}
                </div>
                <div className="text-xs text-gray-300 mt-0.5">{skill.description}</div>
                {skill.scienceNote && (
                  <div className="text-[10px] text-blue-300/70 mt-0.5">💡 {skill.scienceNote}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 科学知识卡 */}
        {card.scienceCard && (
          <div className="mb-3">
            <div className="text-xs text-gray-500 font-bold mb-1.5 border-b border-gray-700 pb-1">── 你知道吗？──</div>
            <div className="text-xs text-gray-300 leading-relaxed">📚 {card.scienceCard}</div>
          </div>
        )}

        {/* 出场条件（仅有 factionRequirement 时显示）*/}
        {card.factionRequirement && (
          <div className="mb-3">
            <div className="text-xs text-gray-500 font-bold mb-1.5 border-b border-gray-700 pb-1">── 出场条件 ──</div>
            <div className="text-xs text-yellow-300">
              🔒 弃牌堆需 {FACTIONS[card.factionRequirement.faction]?.icon}×{card.factionRequirement.count}
              {card.factionRequirement.type === 'consume' && ' (消耗)'}
            </div>
          </div>
        )}

        {/* 标签 */}
        {card.tags && card.tags.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {card.tags.map((tag, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">
                  🏷️ {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 按钮 */}
        <div className="flex gap-2 mt-2">
          {canAdd && (
            <button
              className="flex-1 text-sm py-2 rounded-lg font-bold bg-blue-600 hover:bg-blue-500 text-white"
              onClick={() => { onAdd(card.id); onClose() }}
            >
              ＋ 选入卡组
            </button>
          )}
          <button
            className={`${canAdd ? 'flex-1' : 'w-full'} text-sm py-2 rounded-lg font-bold bg-gray-700 hover:bg-gray-600 text-gray-300`}
            onClick={onClose}
          >
            关闭
          </button>
        </div>
      </motion.div>
    </>
  )
}

export default function DeckBuilder({ onBack, onSelectDeck, collection }) {
  // 如果传入collection，只显示玩家拥有的卡牌；否则显示全部（向后兼容）
  const ownedMainCards = useMemo(() => {
    if (!collection || collection.length === 0) return selectableMainCards
    return selectableMainCards.filter(c => collection.includes(c.id))
  }, [collection])
  const ownedSpCards = useMemo(() => {
    if (!collection || collection.length === 0) return allSpCards
    return allSpCards.filter(c => collection.includes(c.id))
  }, [collection])
  const [deckSlots, setDeckSlots] = useState(() => loadDecks())
  const [activeSlot, setActiveSlot] = useState(0)
  const [editing, setEditing] = useState(false)
  const [detailCard, setDetailCard] = useState(null) // 卡牌详情弹窗

  // Current deck being edited
  const [mainDeck, setMainDeck] = useState([]) // array of card ids
  const [spDeck, setSpDeck] = useState([])     // array of sp card ids

  // Filters
  const [filterFaction, setFilterFaction] = useState('all')
  // filterType 已移除 — 卡池只显示 character 卡
  const [filterRarity, setFilterRarity] = useState('all')
  const [filterSubType, setFilterSubType] = useState('all')
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
    const rec = generateRecommendedDeck(primary, secondary, ownedMainCards, ownedSpCards)
    setMainDeck(rec.main)
    setSpDeck(rec.sp)
  }, [ownedMainCards, ownedSpCards])

  // Filtered + sorted card pool
  const filteredCards = useMemo(() => {
    const pool = showSp ? ownedSpCards : ownedMainCards
    let filtered = pool

    if (filterFaction !== 'all') {
      filtered = filtered.filter(c => c.faction === filterFaction)
    }
    if (filterRarity !== 'all') {
      filtered = filtered.filter(c => c.rarity === filterRarity)
    }
    if (filterSubType !== 'all') {
      filtered = filtered.filter(c => c.subType === filterSubType)
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
  }, [showSp, filterFaction, filterRarity, filterSubType, sortBy])

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
            主卡({ownedMainCards.length})
          </button>
          <button
            className={`px-3 py-1 text-xs font-bold ${showSp ? 'bg-yellow-600 text-white' : 'text-gray-400'}`}
            onClick={() => setShowSp(true)}
          >
            SP卡({ownedSpCards.length})
          </button>
        </div>

        {/* Faction filter */}
        <select
          className="bg-gray-800 text-xs text-gray-300 rounded px-2 py-1 border border-gray-700"
          value={filterFaction}
          onChange={e => { setFilterFaction(e.target.value); setFilterSubType('all') }}
        >
          <option value="all">全部阵营</option>
          {Object.entries(FACTIONS).map(([key, f]) => (
            <option key={key} value={key}>{f.icon} {f.name}</option>
          ))}
        </select>

        {/* SubType filter (when faction selected) */}
        {filterFaction !== 'all' && SUBTYPES[filterFaction] && (
          <select
            className="bg-gray-800 text-xs text-gray-300 rounded px-2 py-1 border border-gray-700"
            value={filterSubType}
            onChange={e => setFilterSubType(e.target.value)}
          >
            <option value="all">全部子类型</option>
            {SUBTYPES[filterFaction].map(st => (
              <option key={st.key} value={st.key}>{st.name}</option>
            ))}
          </select>
        )}

        {/* Type filter 已移除 — 卡池只显示生物卡，事件卡不可手动选入 */}

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

            const canAdd = !atLimit && !deckFull

            return (
              <motion.div
                key={card.id}
                className={`relative ${canAdd ? 'cursor-pointer' : 'cursor-default'} ${atLimit ? 'opacity-50' : ''}`}
                whileHover={canAdd ? { scale: 1.05 } : {}}
                whileTap={canAdd ? { scale: 0.95 } : {}}
                onClick={() => canAdd && addCard(card.id)}
              >
                <BattleCard card={card} hp={card.hp || 0} maxHp={card.hp || 1} isPlayer={true} isActive={false} />
                {/* ℹ️ 详情按钮 — 右下角，始终可点 */}
                <button
                  className="absolute bottom-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 text-[10px] text-blue-300 flex items-center justify-center hover:bg-blue-600/80 hover:text-white z-30"
                  onClick={(e) => { e.stopPropagation(); setDetailCard(card) }}
                  title="查看详情"
                >
                  ℹ
                </button>
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

      {/* 卡牌详情弹窗 */}
      <AnimatePresence>
        {detailCard && (
          <CardDetailModal
            card={detailCard}
            onClose={() => setDetailCard(null)}
            onAdd={(id) => addCard(id)}
            canAdd={(() => {
              const isSp = detailCard.type === 'sp'
              const deck = isSp ? spDeck : mainDeck
              const max = isSp ? MAX_SAME_SP : MAX_SAME_CARD
              const limit = isSp ? SP_DECK_SIZE : DECK_SIZE
              return deck.length < limit && deck.filter(id => id === detailCard.id).length < max
            })()}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
