import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BattleCard from './Card'
import cards from '../data/cards'
import eventCards from '../data/eventCards'
import spCards from '../data/spCards'
import { FACTIONS, SUBTYPES, DECK_SIZE, SP_DECK_SIZE, MAX_SAME_CARD, MAX_SAME_SP } from '../data/deckRules'
import CardDetailModal from './CardDetailModal'
import { useLanguage } from '../i18n/LanguageContext'
import { loadDecks, saveDecks, MAX_SLOTS } from '../utils/decks'
// 一键推荐是**新玩家做的第一件事**，抽成纯核心才测得到（它曾产出同名 5 张的非法卡组）
import { generateRecommendedDeck } from '../utils/recommendDeck.js'
// 体检 + 一键修正：生成器修好了，但**已经存下来的**卡组不会自己变好（齐齐存档里那副还违规着）
import { findDeckIssues, repairDeck } from '../utils/deckHealth.js'

// allMainCards 包含所有卡（用于 resolveCard / costCurve 等需要查找已入组卡牌的场景）
const allMainCards = [...cards, ...eventCards]
// 卡池显示：生物卡(character) + 事件卡(event) —— deckRules 设计为"生物+事件混编"，
// 事件卡（含"可触发 SP"的）可与生物卡一起选入主卡组（25 张主卡组共享名额）。
const selectableMainCards = cards.filter(c => c.type === 'character')
const selectableMainPool = [...selectableMainCards, ...eventCards]
const allSpCards = spCards

// 卡组存取已抽到 ../utils/decks（CampaignScreen 也要用，避免它 import 整个 DeckBuilder）

// Generate a recommended deck (from available cards pool)
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

export default function DeckBuilder({ onBack, onSelectDeck, collection, highlightCardIds = [], onHighlightExpire, recommendedFactions = null }) {
  const { t, cardName, lang, localName } = useLanguage()
  // 如果传入collection，只显示玩家拥有的卡牌；否则显示全部（向后兼容）
  const ownedMainCards = useMemo(() => {
    if (!collection || Object.keys(collection).length === 0) return selectableMainPool
    return selectableMainPool.filter(c => collection[c.id])
  }, [collection])
  const ownedSpCards = useMemo(() => {
    if (!collection || Object.keys(collection).length === 0) return allSpCards
    return allSpCards.filter(c => collection[c.id])
  }, [collection])
  const [deckSlots, setDeckSlots] = useState(() => loadDecks())
  const [repairedSlot, setRepairedSlot] = useState(null)   // 刚修好的槽位，给一句反馈
  const [activeSlot, setActiveSlot] = useState(0)
  const [editing, setEditing] = useState(false)
  const [detailCard, setDetailCard] = useState(null) // 卡牌详情弹窗
  const [editingNameIdx, setEditingNameIdx] = useState(null)
  const [nameDraft, setNameDraft] = useState('')

  // Current deck being edited
  const [mainDeck, setMainDeck] = useState([]) // array of card ids
  const [spDeck, setSpDeck] = useState([])     // array of sp card ids

  // Filters
  const [filterFaction, setFilterFaction] = useState('all')
  const [filterType, setFilterType] = useState('all') // all | character | event（仅主卡组）
  const [filterRarity, setFilterRarity] = useState('all')
  const [filterSubType, setFilterSubType] = useState('all')
  const [sortBy, setSortBy] = useState('cost') // cost | atk | rarity
  const [showSp, setShowSp] = useState(false)

  // 30s 后自动取消高亮
  React.useEffect(() => {
    if (highlightCardIds.length === 0) return
    const t = setTimeout(() => onHighlightExpire?.(), 30000)
    return () => clearTimeout(t)
  }, [highlightCardIds, onHighlightExpire])

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
    const existing = deckSlots[activeSlot]
    newSlots[activeSlot] = { main: mainDeck, sp: spDeck, name: existing?.name, savedAt: Date.now() }
    setDeckSlots(newSlots)
    saveDecks(newSlots)
    setEditing(false)
  }, [mainDeck, spDeck, activeSlot, deckSlots])

  const renameSlot = useCallback((i, newName) => {
    const trimmed = (newName || '').trim()
    if (!deckSlots[i]) return
    const newSlots = [...deckSlots]
    newSlots[i] = { ...newSlots[i], name: trimmed || undefined }
    setDeckSlots(newSlots)
    saveDecks(newSlots)
  }, [deckSlots])

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
    // 类型筛选（仅主卡组；事件卡与生物卡混编，可单独筛出"事件"找触发 SP 的卡）
    if (!showSp && filterType !== 'all') {
      filtered = filtered.filter(c => filterType === 'event' ? c.type === 'event' : c.type === 'character')
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
  }, [showSp, filterFaction, filterType, filterRarity, filterSubType, sortBy])

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

  // 一键开打 —— ☠️ 这是新玩家的第一道坎：原本点进来是 10 个一模一样的「空卡组 ➕ 新建」，
  // 唯一能立刻开打的入口是页面最底下 12px 的灰字（手机竖屏还要往下滚 116px 才看得见），
  // 而一键「推荐」是 10px 的小按钮、藏在「新建」之后。7 岁的玩家过不了这一关。
  // 做法：用**他自己拥有的卡**组一副合法卡组、存进第一个空槽、直接出战 —— 打完还留着一副能编辑的卡组。
  // ⚠️ 卡不够凑满 25 时**退回默认卡组**，绝不能让按钮点了没反应（宁可换套牌，不可卡住）。
  const handleQuickStart = useCallback(() => {
    // 从闯关/今日挑战进来时，**先按这一关推荐的阵营组** —— 每关的
    // playerConfig.recommendedFactions 早就写好了（ch3 有 nature/tech、body/nature，
    // 还有几关只推荐 tech），以前没人读，一键组卡永远先试 body+tech，第三章就配不上。
    // ⚠️ 后面两组兜底不能删：推荐阵营的卡凑不满 25 张时要能退回去，否则按钮点了没反应。
    const combos = [
      ...(recommendedFactions?.length
        ? [[recommendedFactions[0], recommendedFactions[1] || recommendedFactions[0]]]
        : []),
      ['body', 'tech'], ['nature', 'pathogen'],
    ]
    let rec = null
    for (const [a, b] of combos) {
      const r = generateRecommendedDeck(a, b, ownedMainCards, ownedSpCards)
      if (r.main.length === DECK_SIZE) { rec = r; break }
    }
    if (!rec) { onSelectDeck(null); return }          // 兜底：用默认卡组，照样能玩
    const idx = Math.max(0, deckSlots.findIndex(x => !x))
    const next = [...deckSlots]
    next[idx] = { name: t('deck.quickName'), main: rec.main, sp: rec.sp }
    setDeckSlots(next)
    saveDecks(next)
    const mainCards = rec.main.map(id => allMainCards.find(c => c.id === id)).filter(Boolean)
    const spResolved = rec.sp.map(id => allSpCards.find(c => c.id === id)).filter(Boolean)
    onSelectDeck({ mainCards, spCards: spResolved })
  }, [ownedMainCards, ownedSpCards, deckSlots, onSelectDeck, t, recommendedFactions])

  // 一键修正一副超限的卡组。☠️ 必须落盘 —— 不落盘的话下次打开又是坏的，等于修了个寂寞。
  const handleRepair = useCallback((slotIdx) => {
    const slot = deckSlots[slotIdx]
    if (!slot) return
    const fixed = repairDeck(slot, ownedMainCards.map(c => c.id))
    const next = [...deckSlots]
    next[slotIdx] = fixed
    setDeckSlots(next)
    saveDecks(next)
    setRepairedSlot(slotIdx)
  }, [deckSlots, ownedMainCards])

  // === Slot overview (not editing) ===
  if (!editing) {
    // 只渲染「已有的卡组 + 一个新建位」——十个一模一样的空槽位没有任何信息量，
    // 还把唯一能开打的入口挤到屏幕外（守卫 test-deck-firstrun）。
    const filledIdx = deckSlots.map((sl, i) => (sl ? i : -1)).filter(i => i >= 0)
    const firstEmptyIdx = deckSlots.findIndex(x => !x)
    const visibleIdx = firstEmptyIdx >= 0 ? [...filledIdx, firstEmptyIdx] : filledIdx
    const hasAnyDeck = filledIdx.length > 0
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-6 min-h-screen">
        <div className="flex items-center justify-between mb-6">
          {/* 副标题不是装饰：首页那个按钮写着「⚔️ 自由对战」，落地却是卡组界面 ——
              副标题把「选一套出战 / 也能编辑」说清，标签和落地才对得上。
              （从抽卡、闯关过来也是同一个界面，所以措辞要三条路都成立。） */}
          <div>
            <h1 className="text-2xl font-black text-yellow-400">{t('deck.title')}</h1>
            <p className="text-xs text-gray-400 mt-0.5">{t('deck.subtitle')}</p>
          </div>
          <button
            className="text-sm px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg"
            onClick={onBack}
          >
            {t('deck.back')}
          </button>
        </div>

        {/* 一个卡组都没有时，先给一条「马上能玩」的路 —— 组卡是后面的事 */}
        {!hasAnyDeck && (
          <motion.button
            className="w-full mb-5 py-4 bg-green-600 hover:bg-green-500 rounded-2xl text-white text-lg font-black shadow-lg"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleQuickStart}
          >
            {t('deck.quickStart')}
            <span className="block text-xs font-normal text-green-100/90 mt-0.5">{t('deck.quickStartHint')}</span>
          </motion.button>
        )}

        <div className="space-y-4">
          {visibleIdx.map((i) => deckSlots[i]).map((slot, vi) => {
          const i = visibleIdx[vi]
          // 打开界面就体检。超限的卡组要**看得见**，而不是揣着一副违规的牌去打。
          const issues = findDeckIssues(slot)
          return (
            <motion.div
              key={i}
              className={`p-4 rounded-xl border-2 ${slot ? 'border-blue-500/50 bg-gray-800/80' : 'border-gray-700 bg-gray-800/40 border-dashed'}`}
              whileHover={{ scale: 1.01 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  {slot ? (
                    editingNameIdx === i ? (
                      <input
                        autoFocus
                        value={nameDraft}
                        onChange={e => setNameDraft(e.target.value)}
                        onBlur={() => { renameSlot(i, nameDraft); setEditingNameIdx(null) }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { renameSlot(i, nameDraft); setEditingNameIdx(null) }
                          if (e.key === 'Escape') setEditingNameIdx(null)
                        }}
                        maxLength={20}
                        className="text-lg font-bold text-white bg-gray-700 px-2 py-0.5 rounded outline-none border border-cyan-400"
                      />
                    ) : (
                      <button
                        className="text-lg font-bold text-white hover:text-cyan-300 cursor-text text-left"
                        onClick={() => { setNameDraft(slot.name || ''); setEditingNameIdx(i) }}
                        title={t('deck.renameTip')}
                      >
                        {slot.name || t('deck.slot', { n: i + 1 })}
                      </button>
                    )
                  ) : (
                    <span className="text-lg font-bold text-white">{t('deck.slot', { n: i + 1 })}</span>
                  )}
                  {slot ? (
                    <span className="text-xs text-gray-400 ml-3">
                      {t('deck.mainCount', { n: slot.main.length, total: DECK_SIZE })} | {t('deck.spCount', { n: slot.sp.length })}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500 ml-3">{t('deck.emptySlot')}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold"
                    onClick={() => loadSlot(i)}
                  >
                    {slot ? t('deck.edit') : t('deck.create')}
                  </button>
                  {/* 超限时把「出战」换成「修正」—— 一键修好后 25/25，出战自然回来。
                      不这么做的话，孩子会揣着一副违规的牌去打，而屏幕上什么都没说。 */}
                  {slot && issues && (
                    <button
                      className="text-xs px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold"
                      onClick={() => handleRepair(i)}
                    >
                      {t('deck.repair')}
                    </button>
                  )}
                  {slot && !issues && slot.main.length === DECK_SIZE && (
                    <button
                      className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold"
                      onClick={() => handleSelectForBattle(i)}
                    >
                      {t('deck.battle')}
                    </button>
                  )}
                </div>
              </div>
              {/* 超限警告：说清是哪张卡、多了几张 —— 不说清就只是个吓人的红字 */}
              {issues && (
                <div className="mt-2 text-xs text-orange-300 bg-orange-950/40 border border-orange-700/60 rounded-lg px-2 py-1.5">
                  ⚠️ {t('deck.overLimit', { n: issues.extra })}
                  <span className="text-orange-200/80 ml-1">
                    （{[...issues.overMain, ...issues.overSp]
                      .map(o => `${cardName(allMainCards.find(c => c.id === o.id) || allSpCards.find(c => c.id === o.id) || { id: o.id })} ×${o.count}`)
                      .join('、')}）
                  </span>
                </div>
              )}
              {!issues && repairedSlot === i && (
                <div className="mt-2 text-xs text-green-300">✅ {t('deck.repaired')}</div>
              )}
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
                        title={`${f.icon} ${localName(f)}: ${count}`}
                      />
                    )
                  })}
                </div>
              )}
            </motion.div>
          )})}
        </div>

        {/* Quick start with test deck */}
        <div className="mt-6 text-center">
          <button
            className="text-xs text-gray-500 hover:text-gray-300"
            onClick={() => {
              onSelectDeck(null) // use default test deck
            }}
          >
            {t('deck.defaultDeck')}
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
            {t('deck.back')}
          </button>
          <h2 className="text-lg font-bold text-white">{t('deck.editing', { n: activeSlot + 1 })}</h2>
        </div>
        <div className="flex gap-2">
          <span className={`text-sm font-bold ${mainDeck.length === DECK_SIZE ? 'text-green-400' : 'text-yellow-400'}`}>
            {t('deck.mainCards')} {mainDeck.length}/{DECK_SIZE}
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
            {t('deck.save')}
          </button>
        </div>
      </div>

      {/* Current deck display */}
      <div className="bg-gray-800/60 rounded-xl p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">{t('deck.currentDeck')}</span>
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
                      title={t('deck.costCountTip', { cost, count })}
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
                title={t('deck.removeTip')}
                whileTap={{ scale: 0.9 }}
              >
                <span>{faction?.icon}</span>
                <span className="text-white truncate max-w-[60px]">{card.name.split('·')[0]}</span>
                <span className="text-gray-400">({card.cost})</span>
              </motion.div>
            )
          })}
          {mainDeck.length === 0 && <span className="text-gray-600 text-xs">{t('deck.addHint')}</span>}
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
            {t('deck.mainCards')}({ownedMainCards.length})
          </button>
          <button
            className={`px-3 py-1 text-xs font-bold ${showSp ? 'bg-yellow-600 text-white' : 'text-gray-400'}`}
            onClick={() => setShowSp(true)}
          >
            {t('deck.spCards')}({ownedSpCards.length})
          </button>
        </div>

        {/* Faction filter */}
        <select
          className="bg-gray-800 text-xs text-gray-300 rounded px-2 py-1 border border-gray-700"
          value={filterFaction}
          onChange={e => { setFilterFaction(e.target.value); setFilterSubType('all') }}
        >
          <option value="all">{t('deck.allFaction')}</option>
          {Object.entries(FACTIONS).map(([key, f]) => (
            <option key={key} value={key}>{f.icon} {localName(f)}</option>
          ))}
        </select>

        {/* SubType filter (when faction selected) */}
        {filterFaction !== 'all' && SUBTYPES[filterFaction] && (
          <select
            className="bg-gray-800 text-xs text-gray-300 rounded px-2 py-1 border border-gray-700"
            value={filterSubType}
            onChange={e => setFilterSubType(e.target.value)}
          >
            <option value="all">{t('deck.allSubType')}</option>
            {SUBTYPES[filterFaction].map(st => (
              <option key={st.key} value={st.key}>{localName(st)}</option>
            ))}
          </select>
        )}

        {/* Type filter — 生物/事件（仅主卡组；SP 区无事件卡）*/}
        {!showSp && (
          <select
            className="bg-gray-800 text-xs text-gray-300 rounded px-2 py-1 border border-gray-700"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="all">{t('deck.allType')}</option>
            <option value="character">{t('deck.typeBio')}</option>
            <option value="event">{t('deck.typeEvent')}</option>
          </select>
        )}

        {/* Rarity filter */}
        <select
          className="bg-gray-800 text-xs text-gray-300 rounded px-2 py-1 border border-gray-700"
          value={filterRarity}
          onChange={e => setFilterRarity(e.target.value)}
        >
          <option value="all">{t('deck.allRarity')}</option>
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
          <option value="cost">{t('deck.sortCost')}</option>
          <option value="atk">{t('deck.sortAtk')}</option>
          <option value="rarity">{t('deck.sortRarity')}</option>
        </select>

        {/* Recommended decks */}
        <div className="flex gap-1 ml-auto">
          <button
            className="text-xs px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-bold"
            onClick={() => applyRecommended('body', 'tech')}
            title={t('deck.comboBodyTech')}
          >
            🧬⚗️ {t('deck.recommend')}
          </button>
          <button
            className="text-xs px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded-lg font-bold"
            onClick={() => applyRecommended('nature', 'pathogen')}
            title={t('deck.comboNaturePathogen')}
          >
            🌱🦠 {t('deck.recommend')}
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

            const isHighlighted = highlightCardIds.includes(card.id)

            return (
              <motion.div
                key={card.id}
                className={`relative ${canAdd ? 'cursor-pointer' : 'cursor-default'} ${atLimit ? 'opacity-50' : ''} ${isHighlighted ? 'ring-4 ring-yellow-400 rounded-xl' : ''}`}
                whileHover={canAdd ? { scale: 1.05 } : {}}
                whileTap={canAdd ? { scale: 0.95 } : {}}
                animate={isHighlighted ? { boxShadow: ['0 0 0 0 rgba(250,204,21,0.0)', '0 0 18px 4px rgba(250,204,21,0.7)', '0 0 0 0 rgba(250,204,21,0.0)'] } : {}}
                transition={isHighlighted ? { duration: 1.6, repeat: Infinity } : {}}
                onClick={() => canAdd && addCard(card.id)}
              >
                {isHighlighted && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-30 bg-yellow-400 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full shadow">NEW</div>
                )}
                <BattleCard card={card} hp={card.hp || 0} maxHp={card.hp || 1} isPlayer={true} isActive={false} />
                {/* ℹ️ 详情按钮 — 右下角，始终可点 */}
                <button
                  className="absolute bottom-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 text-[10px] text-blue-300 flex items-center justify-center hover:bg-blue-600/80 hover:text-white z-30"
                  onClick={(e) => { e.stopPropagation(); setDetailCard(card) }}
                  title={t('common.viewDetails')}
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

      {/* 卡牌详情弹窗 — 通用 CardDetailModal + "加入卡组" actions slot */}
      {detailCard && (() => {
        const isSp = detailCard.type === 'sp'
        const deck = isSp ? spDeck : mainDeck
        const max = isSp ? MAX_SAME_SP : MAX_SAME_CARD
        const limit = isSp ? SP_DECK_SIZE : DECK_SIZE
        const canAdd = deck.length < limit && deck.filter(id => id === detailCard.id).length < max
        return (
          <CardDetailModal
            card={detailCard}
            onClose={() => setDetailCard(null)}
            context="deck"
            ownership={{ count: collection?.[detailCard.id] || 0 }}
            actions={
              <div className="flex gap-2 mt-1">
                {canAdd && (
                  <button
                    className="flex-1 text-sm py-2 rounded-lg font-bold bg-blue-600 hover:bg-blue-500 text-white"
                    onClick={() => { addCard(detailCard.id); setDetailCard(null) }}
                  >
                    {t('deck.detail.addToDeck')}
                  </button>
                )}
                <button
                  className={`${canAdd ? 'flex-1' : 'w-full'} text-sm py-2 rounded-lg font-bold bg-gray-700 hover:bg-gray-600 text-gray-300`}
                  onClick={() => setDetailCard(null)}
                >
                  {t('deck.detail.close')}
                </button>
              </div>
            }
          />
        )
      })()}
    </div>
  )
}
