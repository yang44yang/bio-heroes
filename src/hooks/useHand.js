import { useState, useCallback, useRef } from 'react'
import { STARTING_HAND, MAX_HAND, DRAW_PER_TURN } from '../data/deckRules.js'

/**
 * 洗牌（Fisher-Yates）
 */
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * mintHandUid — 「卡组 → 手牌」这条路的 uid 产地。纯函数，供 useHand 与测试共用。
 *
 * ★ uid 必须带 side 前缀 —— 这是「双方同名卡不会互相串台」的唯一保证。
 *   BattleScreen 跑两个 useHand 实例（player/enemy），而引擎里 summonedThisTurn /
 *   attackedThisTurn 是**双方共用一个 Set**（useBattle.js:42-43），combat.js:124-125
 *   纯按 card.uid 查表、不带 side 参数。所以不带前缀时，两副卡组只要在同一下标上有
 *   同一张卡（uid 都会是 `whale_3`），一方召唤 → 另一方那张立刻被误判召唤疲劳/已攻击。
 *
 *   同侧参照：SP 卡组的 uid 早就带方前缀（useBattle.js:1556-1557 的 sp_p_/sp_e_）——
 *   手牌这条路是**漏的，不是取舍**。过去没暴雷只因 PvE 双方卡组恰好不同；公平模式
 *   （双方全卡池自由组卡、大概率互抄卡表）让「双方卡组高度重合」从边缘变默认。
 *
 *   提成具名纯函数而非内联，是为了让 scripts/test-hand-uid.mjs 能真断言这条不变式
 *   （React hook 在 Node 里跑不了 → 内联就只能靠正则匹配源码文本，那是假绿的温床）。
 *
 * @param {string} cardId - 卡牌 id（cards.js 的 id 字段）
 * @param {number} index  - 在卡组中的下标
 * @param {'player'|'enemy'} side - 归属方
 * @returns {string} 全局唯一的手牌 uid
 */
export function mintHandUid(cardId, index, side) {
  if (side !== 'player' && side !== 'enemy') {
    throw new Error(`mintHandUid: side 必须是 'player' 或 'enemy'，收到 ${JSON.stringify(side)}`)
  }
  return `${side}_${cardId}_${index}`
}

/**
 * useHand — 管理卡组、手牌、弃牌堆
 *
 * @param {Array} deckCards - 卡牌数组（原始数据）
 * @param {'player'|'enemy'} side - 归属方。**必填**，理由见 mintHandUid。
 * @returns hand/deck/discard 状态 + 操作函数
 */
export function useHand(deckCards, side) {
  const initDeck = useRef(
    deckCards.map((c, i) => ({ ...c, uid: mintHandUid(c.id, i, side) }))
  )

  const [drawPile, setDrawPile] = useState([])   // 抽牌堆
  const [hand, setHand] = useState([])            // 手牌
  const [discard, setDiscard] = useState([])      // 弃牌堆

  /**
   * 初始化：洗牌 → 抽起手手牌
   */
  const initHand = useCallback(() => {
    const shuffled = shuffle(initDeck.current)
    const startHand = shuffled.slice(0, STARTING_HAND)
    const remaining = shuffled.slice(STARTING_HAND)
    setHand(startHand)
    setDrawPile(remaining)
    setDiscard([])
    return startHand
  }, [])

  /**
   * 抽牌（每回合调用）
   * @param {number} count - 抽几张，默认 1
   * @returns {Array} 实际抽到的卡
   */
  const draw = useCallback((count = DRAW_PER_TURN) => {
    let drawn = []
    setDrawPile(prev => {
      const pile = [...prev]
      const toDraw = Math.min(count, pile.length)
      drawn = pile.splice(0, toDraw)
      return pile
    })
    setHand(prev => [...prev, ...drawn])
    return drawn
  }, [])

  /**
   * 从手牌打出一张卡（按 uid）
   * @returns 被打出的卡，或 null
   */
  const playCard = useCallback((uid) => {
    let played = null
    setHand(prev => {
      const idx = prev.findIndex(c => c.uid === uid)
      if (idx === -1) return prev
      const next = [...prev]
      played = next.splice(idx, 1)[0]
      return next
    })
    return played
  }, [])

  /**
   * 弃牌（卡牌被击败 / 替换 / 手牌超上限）
   */
  const discardCard = useCallback((card) => {
    setDiscard(prev => [...prev, card])
  }, [])

  /**
   * 换卡（Mulligan）— 将选中的手牌放回抽牌堆，洗牌，再抽同等数量
   * @param {string[]} uids - 要换掉的卡的 uid 列表
   * @returns {Array} 新抽到的卡
   */
  const mulligan = useCallback((uids) => {
    if (uids.length === 0) return []

    // 直接从当前 state 快照计算，避免 React 18 批处理中
    // 跨 setState updater 的变量共享问题
    const toReturn = hand.filter(c => uids.includes(c.uid))
    const toKeep = hand.filter(c => !uids.includes(c.uid))

    // 放回抽牌堆并洗牌，再抽同等数量
    const newPile = shuffle([...drawPile, ...toReturn])
    const count = Math.min(toReturn.length, newPile.length)
    const drawn = newPile.splice(0, count)

    // 一次性设置所有状态
    setHand([...toKeep, ...drawn])
    setDrawPile(newPile)

    return drawn
  }, [hand, drawPile])

  /**
   * 手牌上限检查 — 弃掉多余的牌（从尾部弃）
   * @returns 被弃掉的卡
   */
  const trimHand = useCallback(() => {
    let discarded = []
    setHand(prev => {
      if (prev.length <= MAX_HAND) return prev
      const keep = prev.slice(0, MAX_HAND)
      discarded = prev.slice(MAX_HAND)
      return keep
    })
    if (discarded.length > 0) {
      setDiscard(prev => [...prev, ...discarded])
    }
    return discarded
  }, [])

  // 直接追加到手牌（Conundrum 起手奖励用，绕过抽牌堆）
  const addToHand = useCallback((extraCards) => {
    if (!extraCards || extraCards.length === 0) return
    const stamped = extraCards.map((c, i) => ({
      ...c,
      // side 前缀同 initDeck：Date.now() 隔不开双方（同一毫秒内双方各拿一张同名奖励卡
      // 就撞）。理由见本文件顶部 useHand 的 uid 注释。
      uid: `bonus_${side}_${c.id}_${Date.now()}_${i}`,
    }))
    setHand(prev => [...prev, ...stamped])
  }, [side])

  return {
    hand,
    drawPile,
    discard,
    drawPileCount: drawPile.length,
    initHand,
    draw,
    playCard,
    discardCard,
    mulligan,
    trimHand,
    addToHand,
  }
}
