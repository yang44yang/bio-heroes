import { useCallback } from 'react'
import cards from '../data/cards.js'
import eventCards from '../data/eventCards.js'
import spCards from '../data/spCards.js'

// 普通卡池（不含 SP）
const regularCards = [...cards, ...eventCards]
// SP 卡池：只取 unlockMode === 'gacha' 的（campaign_only 的留给通关解锁）
const gachaSpCards = spCards.filter(c => c.unlockMode === 'gacha')

// 档位权重：R 68 / SR 25 / SSR 5 / SP 2（齐齐反馈"抽不到 SP"，给 2% 基础概率）
// 导出给守卫读：`.claude/rules/gacha-cards.md` 的概率表必须和这里对得上
//（曾经文档写 85/12/3、代码是 68/25/5/2，还漏了整个 SP 档 —— test-docs-truth 钉死）
export const RARITY_WEIGHTS = { R: 68, SR: 25, SSR: 5, SP: 2 }

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
 * 钻石抽卡的纯核心：从**抽卡池 SP**（unlockMode === 'gacha'）里必出一张。
 *
 * ☠️ 必须是导出的纯函数，不能只藏在 hook 里 —— `useCallback` 在 Node 里没有 renderer，
 *    守卫一调就抛「Invalid hook call」，等于这条「必出 SP」的承诺没人验证。
 * ☠️ 池子只能是 `gachaSpCards`：`campaign_only` 的 SP 是通关奖励，
 *    绝不能从任何抽卡入口漏出来（既有规则，别因为新增入口被绕过）。
 */
export function rollSpCard(seq = 0) {
  const card = gachaSpCards[Math.floor(Math.random() * gachaSpCards.length)]
  // _gachaSlot 标记档位（UI 靠它放 SP 特效）；不污染卡牌本身的 rarity
  return { ...card, instanceId: `${card.id}_${Date.now()}_${seq}`, _gachaSlot: 'SP' }
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

  // 钻石抽卡：必出 SP。薄薄包一层纯函数，真逻辑在 rollSpCard 里（守卫直接测那个）
  const pullSp = useCallback(() => [rollSpCard()], [])

  return { pull, pullSp }
}
