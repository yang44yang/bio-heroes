import { useState, useCallback, useEffect, useRef } from 'react'
import { getEvolutionTarget } from '../data/evolutions'
import { migrateData } from '../utils/saveManager'

const STORAGE_KEY = 'bio-heroes-economy'
const INITIAL_COINS = 3000 // 新玩家初始金币（够30次单抽或3次十连）

// 新玩家初始卡牌礼包（25张，刚好够组一副主卡组）
const STARTER_COLLECTION = [
  // 🌱自然系 7张
  'ant_soldier',        // 蚂蚁 R ×2 (collection只存id，不重复)
  'bee_worker',         // 蜜蜂 R
  'mimosa_timid',       // 含羞草 R
  'sunflower_charger',  // 向日葵 R
  'cheetah_sprinter',   // 猎豹 SR
  // 🧬人体系 7张
  'platelet_guardian',  // 血小板 R
  'red_blood_cell',     // 红细胞 R
  'white_blood_cell',   // 白细胞 SR
  'stomach_acid',       // 胃酸 R
  'skin_barrier',       // 皮肤 R
  // 🦠病原系 5张
  'flu_virus',          // 流感病毒 R
  'cavity_bacteria',    // 蛀牙菌 R
  'ecoli_thug',         // 大肠杆菌 R
  'bacteriophage_killer', // 噬菌体 SR
  // ⚗️科技系 5张
  'bandaid_helper',     // 创可贴 R
  'thermometer_alarm',  // 体温计 R
  'stethoscope_listener', // 听诊器 R
  'microscope_eye',     // 显微镜 R
]

// 事件卡也放入初始收藏（用于组卡组）
const STARTER_EVENT_CARDS = [
  'event_lab_observation',  // 实验观察 ⚗️
  'event_immune_response',  // 免疫应答 🧬
]

const DEFAULT_STATE = {
  saveVersion: 4,
  coins: INITIAL_COINS,     // 新玩家初始金币
  diamonds: 10,             // 钻石（稀有，后期扩展）
  collection: {},           // 拥有的卡牌 { cardId: count }
  fragments: {},             // 碎片 { cardId: count }
  pityCounter: 0,           // SSR 保底计数器
  totalPulls: 0,
  unlockedSPs: [],          // 已通关解锁的 campaign_only SP 卡 ID 列表
  unlockedAchievements: [], // 已解锁的主题成就 ID 列表（向后兼容：老存档默认空数组）
  battlesWon: 0,            // 累计胜场（战斗成就用，向后兼容默认 0）
  battlesTotal: 0,          // 累计场次
  quizCorrectTotal: 0,      // 累计答对题数（战斗内，答题成就用）
  quizTotalAnswered: 0,     // 累计答题数（战斗内）
}

function arrayToCollectionMap(ids) {
  const map = {}
  for (const id of ids) map[id] = (map[id] || 0) + 1
  return map
}

function loadEconomy() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const migrated = migrateData(parsed)
      // 老玩家自动标记已看过介绍
      if (!localStorage.getItem('bio-heroes-intro-seen')) {
        localStorage.setItem('bio-heroes-intro-seen', 'true')
      }
      return { ...DEFAULT_STATE, ...(migrated || parsed) }
    }
  } catch (e) { /* ignore */ }
  // 全新玩家：给初始卡牌礼包
  return {
    ...DEFAULT_STATE,
    collection: arrayToCollectionMap([...STARTER_COLLECTION, ...STARTER_EVENT_CARDS]),
    isNewPlayer: true, // 标记用于显示欢迎提示
  }
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
  const stateRef = useRef(state)

  // Auto-save on state change + 同步最新 state 到 ref（供 pullCards 同步计算结果使用）
  useEffect(() => {
    stateRef.current = state
    saveEconomy(state)
  }, [state])

  // === 货币操作 ===

  const addCoins = useCallback((amount) => {
    setState(prev => ({ ...prev, coins: prev.coins + amount }))
  }, [])

  const addDiamonds = useCallback((amount) => {
    setState(prev => ({ ...prev, diamonds: (prev.diamonds || 0) + amount }))
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
  const MAX_COPIES_PER_CARD = 3  // 与卡组同名上限一致

  const pullCards = useCallback((pulledCards) => {
    // 持有量未达 MAX_COPIES_PER_CARD → 入库 +1; 否则转碎片
    // 用 stateRef 读当前 state 同步算 results，再 setState 更新；保证返回值一定有效（不依赖 setState updater 的执行时机）
    const prev = stateRef.current
    const newCollection = { ...prev.collection }
    const newFragments = { ...prev.fragments }
    let newPity = prev.pityCounter
    const results = []

    for (const card of pulledCards) {
      newPity++
      const currentCount = newCollection[card.id] || 0

      if (currentCount < MAX_COPIES_PER_CARD) {
        newCollection[card.id] = currentCount + 1
        results.push({
          ...card,
          isNew: currentCount === 0,
          isDupe: false,
          count: currentCount + 1,
          fragments: 0,
        })
      } else {
        const fragCount = card.rarity === 'SSR' ? 50 : card.rarity === 'SR' ? 20 : FRAGMENTS_PER_DUPE
        newFragments[card.id] = (newFragments[card.id] || 0) + fragCount
        results.push({
          ...card,
          isNew: false,
          isDupe: true,
          count: MAX_COPIES_PER_CARD,
          fragments: fragCount,
        })
      }

      if (card.rarity === 'SSR') {
        newPity = 0
      }
    }

    const nextState = {
      ...prev,
      collection: newCollection,
      fragments: newFragments,
      pityCounter: newPity,
      totalPulls: prev.totalPulls + pulledCards.length,
    }
    stateRef.current = nextState
    setState(nextState)
    return results
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
    if (!state.collection[cardId]) return null
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
      if (!prev.collection[cardId]) return prev
      const have = prev.fragments[cardId] || 0
      if (have < evo.fragmentCost) return prev

      const newFragments = { ...prev.fragments }
      newFragments[cardId] = have - evo.fragmentCost

      const newCollection = { ...prev.collection }
      if (!newCollection[evo.targetCardId]) {
        newCollection[evo.targetCardId] = 1
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

  // SSR保底券：下次抽卡必出SSR（设pity到49，下一抽触发硬保底50）
  const useSSRTicket = useCallback(() => {
    setState(prev => ({ ...prev, pityCounter: SSR_PITY - 1 }))
  }, [])

  // === 碎片商店 ===
  const FRAGMENT_TO_COIN_RATE = 2  // 1 碎片 = 2 金币

  const sellFragments = useCallback((cardId, count) => {
    setState(prev => {
      const have = prev.fragments[cardId] || 0
      const sellCount = Math.min(have, Math.max(0, Math.floor(count)))
      if (sellCount <= 0) return prev
      const newFragments = { ...prev.fragments }
      const remaining = have - sellCount
      if (remaining > 0) newFragments[cardId] = remaining
      else delete newFragments[cardId]
      return {
        ...prev,
        fragments: newFragments,
        coins: prev.coins + sellCount * FRAGMENT_TO_COIN_RATE,
      }
    })
  }, [])

  // 加碎片（每日挑战等奖励用；幂等加法，复刻 pullCards 的 fragments 写法）
  const addFragments = useCallback((cardId, count) => {
    if (!cardId || !count) return
    setState(prev => ({
      ...prev,
      fragments: { ...prev.fragments, [cardId]: (prev.fragments[cardId] || 0) + count },
    }))
  }, [])

  // 一键卖出所有"无进化路径"的碎片
  const sellAllUnusedFragments = useCallback(() => {
    setState(prev => {
      const newFragments = { ...prev.fragments }
      let totalCoins = 0
      for (const cardId of Object.keys(prev.fragments)) {
        if (getEvolutionTarget(cardId)) continue  // 有进化路径的保留
        totalCoins += prev.fragments[cardId] * FRAGMENT_TO_COIN_RATE
        delete newFragments[cardId]
      }
      if (totalCoins === 0) return prev
      return {
        ...prev,
        fragments: newFragments,
        coins: prev.coins + totalCoins,
      }
    })
  }, [])

  // 清除新玩家标记
  const dismissNewPlayer = useCallback(() => {
    setState(prev => {
      const { isNewPlayer, ...rest } = prev
      return rest
    })
  }, [])

  // 通关解锁 campaign_only SP 卡（幂等：已解锁则不变）
  const unlockCampaignSP = useCallback((spId) => {
    setState(prev => {
      const list = prev.unlockedSPs || []
      if (list.includes(spId)) return prev
      return { ...prev, unlockedSPs: [...list, spId] }
    })
  }, [])

  // 标记成就为已解锁（幂等，支持批量）
  const markAchievementsUnlocked = useCallback((achievementIds) => {
    if (!achievementIds || achievementIds.length === 0) return
    setState(prev => {
      const list = prev.unlockedAchievements || []
      const toAdd = achievementIds.filter(id => !list.includes(id))
      if (toAdd.length === 0) return prev
      return { ...prev, unlockedAchievements: [...list, ...toAdd] }
    })
  }, [])

  // 累计战斗/答题统计（成就用）— stateRef 模式（同 pullCards）同步累加并返回新快照，
  // 供成就检测立即读取，避免 setState 异步导致读到旧值
  const recordBattleResult = useCallback((battleResult) => {
    const prev = stateRef.current
    const next = {
      ...prev,
      battlesWon: (prev.battlesWon || 0) + (battleResult.won ? 1 : 0),
      battlesTotal: (prev.battlesTotal || 0) + 1,
      quizCorrectTotal: (prev.quizCorrectTotal || 0) + (battleResult.quizCorrect || 0),
      quizTotalAnswered: (prev.quizTotalAnswered || 0) + (battleResult.quizTotal || 0),
    }
    stateRef.current = next
    setState(next)
    return {
      battlesWon: next.battlesWon,
      battlesTotal: next.battlesTotal,
      quizCorrectTotal: next.quizCorrectTotal,
      quizTotalAnswered: next.quizTotalAnswered,
    }
  }, [])

  return {
    coins: state.coins,
    diamonds: state.diamonds,
    collection: state.collection,
    fragments: state.fragments,
    pityCounter: state.pityCounter,
    totalPulls: state.totalPulls,
    isNewPlayer: !!state.isNewPlayer,
    unlockedSPs: state.unlockedSPs || [],
    unlockedAchievements: state.unlockedAchievements || [],
    battlesWon: state.battlesWon ?? 0,
    battlesTotal: state.battlesTotal ?? 0,
    quizCorrectTotal: state.quizCorrectTotal ?? 0,
    quizTotalAnswered: state.quizTotalAnswered ?? 0,

    addCoins,
    addDiamonds,
    spendCoins,
    canAfford,
    calculateBattleReward,
    claimBattleReward,
    pullCards,
    checkEvolution,
    evolveCard,
    dismissNewPlayer,
    useSSRTicket,
    sellFragments,
    sellAllUnusedFragments,
    addFragments,
    unlockCampaignSP,
    markAchievementsUnlocked,
    recordBattleResult,

    SINGLE_COST,
    MULTI_COST,
    SSR_PITY,
    MAX_COPIES_PER_CARD,
    FRAGMENT_TO_COIN_RATE,
  }
}
