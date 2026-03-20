import { useCallback } from 'react'
import cards from '../data/cards'
import eventCards from '../data/eventCards'

const allCards = [...cards, ...eventCards]

const RARITY_WEIGHTS = { R: 70, SR: 25, SSR: 5 }

function rollRarity(pityCounter, ssrPity = 50) {
  // SSR pity: guaranteed at ssrPity pulls
  if (pityCounter >= ssrPity - 1) return 'SSR'

  // Soft pity: increase SSR rate after 40 pulls
  let ssrRate = RARITY_WEIGHTS.SSR
  if (pityCounter >= 40) {
    ssrRate += (pityCounter - 40) * 3 // +3% per pull after 40
  }

  const roll = Math.random() * 100
  if (roll < ssrRate) return 'SSR'
  if (roll < ssrRate + RARITY_WEIGHTS.SR) return 'SR'
  return 'R'
}

/**
 * useGacha — 抽卡逻辑
 * 需要配合 useEconomy 使用
 */
export function useGacha() {
  const pull = useCallback((count = 1, pityCounter = 0, ssrPity = 50) => {
    const pulled = []
    let pity = pityCounter

    for (let i = 0; i < count; i++) {
      let rarity = rollRarity(pity, ssrPity)

      // 十连保底：最后一张如果整个十连没有SR+，强制SR
      if (count >= 10 && i === count - 1) {
        const hasSRPlus = pulled.some(c => c.rarity === 'SR' || c.rarity === 'SSR')
        if (!hasSRPlus) rarity = 'SR'
      }

      const pool = allCards.filter(c => c.rarity === rarity)
      const card = pool[Math.floor(Math.random() * pool.length)]

      if (rarity === 'SSR') pity = 0
      else pity++

      pulled.push({ ...card, instanceId: `${card.id}_${Date.now()}_${i}` })
    }

    return { pulled, newPityCounter: pity }
  }, [])

  return { pull }
}
