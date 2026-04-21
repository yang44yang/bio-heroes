import { useCallback } from 'react'
import cards from '../data/cards'
import eventCards from '../data/eventCards'
import spCards from '../data/spCards'

// 普通卡池（不含 SP）
const regularCards = [...cards, ...eventCards]
// SP 卡池：只取 unlockMode === 'gacha' 的（campaign_only 的留给通关解锁）
const gachaSpCards = spCards.filter(c => c.unlockMode === 'gacha')

// 档位权重：R 68 / SR 25 / SSR 5 / SP 2（齐齐反馈"抽不到 SP"，给 2% 基础概率）
const RARITY_WEIGHTS = { R: 68, SR: 25, SSR: 5, SP: 2 }

function rollRarity(pityCounter, ssrPity = 50) {
  // SSR pity: guaranteed at ssrPity pulls（SP 不计入 pity，SSR 与 SP 走两套）
  if (pityCounter >= ssrPity - 1) return 'SSR'

  // Soft pity: increase SSR rate after 40 pulls
  let ssrRate = RARITY_WEIGHTS.SSR
  if (pityCounter >= 40) {
    ssrRate += (pityCounter - 40) * 3
  }

  const roll = Math.random() * 100
  // 顺序：SP（2%）→ SSR（5% + soft pity）→ SR（25%）→ R（其余）
  if (roll < RARITY_WEIGHTS.SP) return 'SP'
  if (roll < RARITY_WEIGHTS.SP + ssrRate) return 'SSR'
  if (roll < RARITY_WEIGHTS.SP + ssrRate + RARITY_WEIGHTS.SR) return 'SR'
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

      // 十连保底：最后一张如果整个十连没有 SR+，强制 SR
      if (count >= 10 && i === count - 1) {
        const hasSRPlus = pulled.some(c => c.rarity === 'SR' || c.rarity === 'SSR' || c._gachaSlot === 'SP')
        if (!hasSRPlus) rarity = 'SR'
      }

      let pool
      if (rarity === 'SP') {
        // 从 gacha-only SP 卡池抽（campaign_only 永不在抽卡池出现）
        pool = gachaSpCards
      } else {
        pool = regularCards.filter(c => c.rarity === rarity)
      }
      const card = pool[Math.floor(Math.random() * pool.length)]

      // SSR 重置 pity；SP 也重置（避免 SP/SSR 同时撞软保底）
      if (rarity === 'SSR' || rarity === 'SP') pity = 0
      else pity++

      // _gachaSlot 标记本次抽卡的档位（用于 UI 区分 SP 特效；不污染卡牌本身的 rarity）
      pulled.push({ ...card, instanceId: `${card.id}_${Date.now()}_${i}`, _gachaSlot: rarity })
    }

    return { pulled, newPityCounter: pity }
  }, [])

  return { pull }
}
