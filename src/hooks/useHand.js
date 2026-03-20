import { useState, useCallback, useRef } from 'react'
import { STARTING_HAND, MAX_HAND, DRAW_PER_TURN } from '../data/deckRules'

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
 * useHand — 管理卡组、手牌、弃牌堆
 *
 * @param {Array} deckCards - 20 张卡牌数组（原始数据）
 * @returns hand/deck/discard 状态 + 操作函数
 */
export function useHand(deckCards) {
  // 给每张卡加 uid 以区分同名卡
  const initDeck = useRef(
    deckCards.map((c, i) => ({ ...c, uid: `${c.id}_${i}` }))
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
  }
}
