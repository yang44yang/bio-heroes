import { useState, useCallback, useEffect } from 'react'
import { getEvolutionTarget } from '../data/evolutions'
import { migrateData } from '../utils/saveManager'

const STORAGE_KEY = 'bio-heroes-economy'

const DEFAULT_STATE = {
  saveVersion: 2,
  coins: 500,       // 金币（战斗奖励获取）
  diamonds: 10,     // 钻石（稀有，后期扩展）
  collection: [],   // 拥有的卡牌 id 列表（去重）
  fragments: {},     // 碎片 { cardId: count }
  pityCounter: 0,   // SSR 保底计数器
  totalPulls: 0,
}

function loadEconomy() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const migrated = migrateData(parsed)
      return { ...DEFAULT_STATE, ...(migrated || parsed) }
    }
  } catch (e) { /* ignore */ }
  return { ...DEFAULT_STATE }
}

function saveEconomy(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

/**
 * useEconomy — 经济系统
 * 管理金币/钻石/卡牌收藏/碎片/保底计数
 */
export function useEconomy() {
  const [state, setState] = useState(() => loadEconomy())

  // Auto-save on state change
  useEffect(() => {
    saveEconomy(state)
  }, [state])

  // === 货币操作 ===

  const addCoins = useCallback((amount) => {
    setState(prev => ({ ...prev, coins: prev.coins + amount }))
  }, [])

  const spendCoins = useCallback((amount) => {
    return setState(prev => {
      if (prev.coins < amount) return prev
      return { ...prev, coins: prev.coins - amount }
    })
  }, [])

  const canAfford = useCallback((amount) => {
    return state.coins >= amount
  }, [state.coins])

  // === 战斗奖励 ===

  const calculateBattleReward = useCallback((result) => {
    // result: { won, quizCorrect, turnsPlayed }
    let coins = 0
    if (result.won) {
      coins = 100
      // 答题 bonus: 每答对1题 +10 金币
      coins += (result.quizCorrect || 0) * 10
    } else {
      coins = 40
      // 答题 bonus 减半
      coins += (result.quizCorrect || 0) * 5
    }
    return { coins }
  }, [])

  const claimBattleReward = useCallback((reward) => {
    setState(prev => ({
      ...prev,
      coins: prev.coins + reward.coins,
    }))
  }, [])

  // === 抽卡 ===

  const SINGLE_COST = 100
  const MULTI_COST = 900  // 十连 = 9 次价格
  const SSR_PITY = 50
  const FRAGMENTS_PER_DUPE = 10

  const pullCards = useCallback((pulledCards) => {
    // Process pulled cards: new cards → collection, dupes → fragments
    setState(prev => {
      const newCollection = [...prev.collection]
      const newFragments = { ...prev.fragments }
      let newPity = prev.pityCounter
      const results = []

      for (const card of pulledCards) {
        newPity++
        const isNew = !newCollection.includes(card.id)

        if (isNew) {
          newCollection.push(card.id)
          results.push({ ...card, isNew: true, fragments: 0 })
        } else {
          // Duplicate → fragments
          const fragCount = card.rarity === 'SSR' ? 50 : card.rarity === 'SR' ? 20 : FRAGMENTS_PER_DUPE
          newFragments[card.id] = (newFragments[card.id] || 0) + fragCount
          results.push({ ...card, isNew: false, fragments: fragCount })
        }

        // Reset pity on SSR
        if (card.rarity === 'SSR') {
          newPity = 0
        }
      }

      return {
        ...prev,
        collection: newCollection,
        fragments: newFragments,
        pityCounter: newPity,
        totalPulls: prev.totalPulls + pulledCards.length,
      }
    })
  }, [])

  // === 进化 ===

  /**
   * 检查是否满足进化条件
   * @returns { canEvolve, target, fragmentsHave, fragmentsNeed } | null
   */
  const checkEvolution = useCallback((cardId) => {
    const evo = getEvolutionTarget(cardId)
    if (!evo) return null
    // 必须拥有当前卡
    if (!state.collection.includes(cardId)) return null
    const have = state.fragments[cardId] || 0
    return {
      canEvolve: have >= evo.fragmentCost,
      target: evo,
      fragmentsHave: have,
      fragmentsNeed: evo.fragmentCost,
    }
  }, [state.collection, state.fragments])

  /**
   * 执行进化：消耗碎片，获得新卡（不失去原卡）
   * @returns boolean 是否成功
   */
  const evolveCard = useCallback((cardId) => {
    const evo = getEvolutionTarget(cardId)
    if (!evo) return false

    let success = false
    setState(prev => {
      if (!prev.collection.includes(cardId)) return prev
      const have = prev.fragments[cardId] || 0
      if (have < evo.fragmentCost) return prev

      const newFragments = { ...prev.fragments }
      newFragments[cardId] = have - evo.fragmentCost

      const newCollection = [...prev.collection]
      if (!newCollection.includes(evo.targetCardId)) {
        newCollection.push(evo.targetCardId)
      }

      success = true
      return {
        ...prev,
        collection: newCollection,
        fragments: newFragments,
      }
    })
    return success
  }, [])

  return {
    coins: state.coins,
    diamonds: state.diamonds,
    collection: state.collection,
    fragments: state.fragments,
    pityCounter: state.pityCounter,
    totalPulls: state.totalPulls,

    addCoins,
    spendCoins,
    canAfford,
    calculateBattleReward,
    claimBattleReward,
    pullCards,
    checkEvolution,
    evolveCard,

    SINGLE_COST,
    MULTI_COST,
    SSR_PITY,
  }
}
