// 进化链数据
// R→SR: 30 碎片, SR→SSR: 80 碎片
// 进化后获得新卡，不失去原卡

export const EVOLUTION_COST = {
  'R→SR': 30,
  'SR→SSR': 80,
}

/**
 * 进化链定义
 * 每条链 = [{ cardId, rarity }, ...]  从低阶到高阶
 */
export const EVOLUTION_CHAINS = [
  // 🌱 自然系：含羞草 → 捕蝇草
  {
    id: 'nature_mimosa_chain',
    name: '含羞草进化链',
    faction: 'nature',
    steps: [
      { cardId: 'mimosa_timid', rarity: 'R' },
      { cardId: 'venus_flytrap', rarity: 'SR' },
    ],
  },
  // ⚗️ 科技系：创可贴 → 青霉素 → 抗生素注射器
  {
    id: 'tech_bandaid_chain',
    name: '创可贴进化链',
    faction: 'tech',
    steps: [
      { cardId: 'bandaid_helper', rarity: 'R' },
      { cardId: 'penicillin_pioneer', rarity: 'SR' },
      { cardId: 'antibiotic_ultimate', rarity: 'SSR' },
    ],
  },
]

/**
 * 根据 cardId 查找该卡可进化的目标
 * @returns { targetCardId, targetRarity, fragmentCost, chainId } | null
 */
export function getEvolutionTarget(cardId) {
  for (const chain of EVOLUTION_CHAINS) {
    const idx = chain.steps.findIndex(s => s.cardId === cardId)
    if (idx >= 0 && idx < chain.steps.length - 1) {
      const current = chain.steps[idx]
      const next = chain.steps[idx + 1]
      const costKey = `${current.rarity}→${next.rarity}`
      return {
        targetCardId: next.cardId,
        targetRarity: next.rarity,
        fragmentCost: EVOLUTION_COST[costKey] || 30,
        chainId: chain.id,
      }
    }
  }
  return null
}

/**
 * 根据 cardId 查找它属于哪条进化链
 * @returns chain object | null
 */
export function getChainForCard(cardId) {
  return EVOLUTION_CHAINS.find(chain =>
    chain.steps.some(s => s.cardId === cardId)
  ) || null
}
