// Bio Heroes 生物英雄传 — 环境事件数据
// 每 3 回合随机触发一个，不重复最近 2 个
// 设计原则：调味料而非决定因素，不让任何一方直接获胜或必败

const environmentEvents = [
  {
    id: "global_warming",
    name: "全球变暖",
    emoji: "🌡️",
    description: "自然系卡 ATK -20%，持续 2 回合",
    scienceNote: "全球平均温度每升高1°C，就会有大量物种面临灭绝风险。珊瑚礁、北极熊、企鹅都是气候变化的受害者。",
    duration: 2,
    apply(playerField, enemyField) {
      const affected = []
      const process = (field) => field.map(c => {
        if (!c || c.currentHp <= 0 || c.faction !== 'nature') return c
        const reduction = Math.round(c.atk * 0.20 / 500) * 500
        affected.push(c.name)
        return { ...c, atk: Math.max(500, c.atk - reduction), statuses: [...(c.statuses || []), { type: 'event_debuff', event: 'global_warming', stat: 'atk', amount: reduction, turnsLeft: 2 }] }
      })
      return { playerField: process(playerField), enemyField: process(enemyField), affected }
    },
  },

  {
    id: "virus_outbreak",
    name: "病毒爆发",
    emoji: "🦠",
    description: "无人体系卡的一方主人每回合 -500 HP，持续 2 回合",
    scienceNote: "免疫系统是我们对抗病原体的防线。没有白细胞和抗体的保护，即使普通感冒也可能致命。",
    duration: 2,
    // This event is handled specially in useBattle (checks for body faction presence)
    apply(playerField, enemyField) {
      const playerHasBody = playerField.some(c => c && c.currentHp > 0 && c.faction === 'body')
      const enemyHasBody = enemyField.some(c => c && c.currentHp > 0 && c.faction === 'body')
      return { playerHasBody, enemyHasBody, affected: [] }
    },
  },

  {
    id: "storm",
    name: "暴风雨",
    emoji: "🌧️",
    description: "全场卡 ATK -10%，自然系不受影响",
    scienceNote: "暴风雨是地球水循环的重要环节。植物和动物经过亿万年的进化，已经适应了恶劣天气。",
    duration: 1,
    apply(playerField, enemyField) {
      const affected = []
      const process = (field) => field.map(c => {
        if (!c || c.currentHp <= 0 || c.faction === 'nature') return c
        const reduction = Math.round(c.atk * 0.10 / 500) * 500
        if (reduction > 0) affected.push(c.name)
        return { ...c, atk: Math.max(500, c.atk - reduction) }
      })
      return { playerField: process(playerField), enemyField: process(enemyField), affected }
    },
  },

  {
    id: "wildfire",
    name: "森林大火",
    emoji: "🔥",
    description: "自然系卡 -1500 HP，病原系不受影响",
    scienceNote: "森林大火虽然可怕，但也是自然循环的一部分。许多植物种子需要火的高温才能发芽，火烧后的土地反而更加肥沃。",
    duration: 0, // instant
    apply(playerField, enemyField) {
      const affected = []
      const process = (field) => field.map(c => {
        if (!c || c.currentHp <= 0 || c.faction !== 'nature') return c
        affected.push(c.name)
        return { ...c, currentHp: Math.max(0, c.currentHp - 1500) }
      })
      return { playerField: process(playerField), enemyField: process(enemyField), affected }
    },
  },

  {
    id: "spring",
    name: "春天来了",
    emoji: "🌸",
    description: "全场卡 +500 HP，自然系额外 +1000 HP",
    scienceNote: "春天日照时间变长，温度升高，植物开始光合作用，动物从冬眠中醒来。整个生态系统焕发新生！",
    duration: 0,
    apply(playerField, enemyField) {
      const affected = []
      const process = (field) => field.map(c => {
        if (!c || c.currentHp <= 0) return c
        const heal = c.faction === 'nature' ? 1500 : 500
        affected.push(c.name)
        return { ...c, currentHp: Math.min(c.maxHp, c.currentHp + heal) }
      })
      return { playerField: process(playerField), enemyField: process(enemyField), affected }
    },
  },

  {
    id: "habitat_destruction",
    name: "栖息地破坏",
    emoji: "🏭",
    description: "双方 HP 最高的卡 ATK -25%",
    scienceNote: "人类活动导致的栖息地破坏是生物多样性丧失的最大原因。每年有数千种物种因为失去家园而走向灭绝。",
    duration: 0,
    apply(playerField, enemyField) {
      const affected = []
      const debuffStrongest = (field) => {
        const alive = field.filter(c => c && c.currentHp > 0)
        if (alive.length === 0) return field
        const strongest = alive.reduce((max, c) => c.currentHp > max.currentHp ? c : max, alive[0])
        return field.map(c => {
          if (!c || c.uid !== strongest.uid) return c
          const reduction = Math.round(c.atk * 0.25 / 500) * 500
          affected.push(c.name)
          return { ...c, atk: Math.max(500, c.atk - reduction) }
        })
      }
      return { playerField: debuffStrongest(playerField), enemyField: debuffStrongest(enemyField), affected }
    },
  },

  {
    id: "symbiosis",
    name: "共生效应",
    emoji: "🤝",
    description: "场上有不同阵营的卡时，每张卡回复 400 HP",
    scienceNote: "共生是自然界最美妙的关系之一！小丑鱼住在海葵里互相保护，犀牛鸟帮犀牛清除寄生虫，人体肠道里的细菌帮我们消化食物。",
    duration: 0,
    apply(playerField, enemyField) {
      const affected = []
      const process = (field) => {
        const alive = field.filter(c => c && c.currentHp > 0)
        const factions = new Set(alive.map(c => c.faction))
        if (factions.size < 2) return field
        return field.map(c => {
          if (!c || c.currentHp <= 0) return c
          affected.push(c.name)
          return { ...c, currentHp: Math.min(c.maxHp, c.currentHp + 400) }
        })
      }
      return { playerField: process(playerField), enemyField: process(enemyField), affected }
    },
  },

  {
    id: "gene_mutation",
    name: "基因突变",
    emoji: "🧪",
    description: "双方各随机一张卡 ATK ×1.5, HP ×0.7",
    scienceNote: "基因突变是进化的引擎！大多数突变是中性的，但偶尔会产生有利或有害的变化。没有突变，就没有地球上丰富多彩的生命。",
    duration: 0,
    apply(playerField, enemyField) {
      const affected = []
      const mutate = (field) => {
        const alive = field.map((c, i) => c && c.currentHp > 0 ? i : -1).filter(i => i >= 0)
        if (alive.length === 0) return field
        const idx = alive[Math.floor(Math.random() * alive.length)]
        return field.map((c, i) => {
          if (i !== idx || !c) return c
          const newAtk = Math.ceil(c.atk * 1.5 / 500) * 500
          const newHp = Math.max(500, Math.floor(c.currentHp * 0.7 / 500) * 500)
          const newMax = Math.max(500, Math.floor(c.maxHp * 0.7 / 500) * 500)
          affected.push(c.name)
          return { ...c, atk: newAtk, currentHp: newHp, maxHp: newMax }
        })
      }
      return { playerField: mutate(playerField), enemyField: mutate(enemyField), affected }
    },
  },
]

export default environmentEvents

/**
 * Pick a random event, avoiding the last N events
 * @param {string[]} recentIds - recently triggered event ids
 * @returns event object
 */
export function pickRandomEvent(recentIds = []) {
  const pool = environmentEvents.filter(e => !recentIds.includes(e.id))
  if (pool.length === 0) return environmentEvents[Math.floor(Math.random() * environmentEvents.length)]
  return pool[Math.floor(Math.random() * pool.length)]
}
