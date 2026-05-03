// 主题成就 — 集齐一组主题卡 → 解锁徽章 + 科学知识包
// 卡片 ID 已对照 cards.js / spCards.js 验证存在

export const COLLECTION_ACHIEVEMENTS = [
  {
    id: 'antibiotic_master',
    name: '抗生素小专家',
    icon: '💊',
    requiredCards: ['penicillin_pioneer', 'antibiotic_ultimate', 'mrna_vaccine'],
    reward: {
      type: 'science_pack',
      title: '📚 抗生素的故事',
      content: `1928 年，弗莱明休假回来发现实验室一个被遗忘的培养皿长了霉菌。
他注意到一件奇怪的事：霉菌周围的细菌都死了！

这种霉菌就是青霉菌，它分泌的物质后来被命名为"青霉素"——
人类第一种抗生素。二战期间挽救了数百万士兵的生命。

但抗生素只对细菌有效，对病毒（如感冒、流感）完全没用。
而且滥用抗生素会让细菌产生"耐药性"，演化出超级细菌。
这就是为什么医生看感冒不一定开抗生素！`,
    },
  },
  {
    id: 'immune_warrior',
    name: '免疫战士',
    icon: '🛡️',
    requiredCards: ['white_blood_cell', 'antibody_missile', 'macrophage_tank', 'lymph_node_filter'],
    reward: {
      type: 'science_pack',
      title: '📚 免疫系统全图',
      content: `你的身体里有一支隐形军队，每秒钟都在保护你！

🏛️ 第一道防线：皮肤、胃酸——挡住大多数病原
🔍 第二道防线：白细胞、巨噬细胞——发现并吞噬入侵者
🎯 第三道防线：淋巴结+抗体——精确识别敌人，一击即中

抗体就像精确制导导弹，每一种针对一种病原。
得过的病为什么不容易再得？因为抗体记住了它的样子。
疫苗就是利用这个原理，让身体提前认识病原。`,
    },
  },
  {
    id: 'microbe_explorer',
    name: '微观探险家',
    icon: '🔬',
    requiredCards: ['amoeba_shapeshifter', 'ecoli_thug', 'bacteriophage_killer'],
    reward: {
      type: 'badge_only',
    },
  },
  {
    id: 'apex_predator',
    name: '顶级猎手',
    icon: '🦈',
    requiredCards: ['shark_hunter', 'orca_alpha', 'cheetah_sprinter'],
    reward: {
      type: 'science_pack',
      title: '📚 食物链顶端的力量',
      content: `海洋有虎鲸，陆地有猎豹，淡水有大鱼——它们都是顶级猎手。

顶级猎手数量很少，但作用巨大：
🐺 控制猎物数量，让生态系统平衡
🦈 吃掉病弱个体，让种群更健康
🦅 没有它们，整片生态可能崩溃

人类是最危险的顶级猎手。当我们捕杀过多大型动物，
整个食物链都会受影响。所以保护顶级捕食者，就是保护生态。`,
    },
  },
  {
    id: 'ocean_giant',
    name: '海洋巨兽',
    icon: '🐋',
    requiredCards: ['blue_whale_titan', 'whale_shark_wall', 'jellyfish_stealth'],
    reward: {
      type: 'badge_only',
    },
  },
]

// 检查是否新解锁了成就（不修改 state，只返回新解锁的成就数组）
export function detectNewlyUnlocked(collection, alreadyUnlocked = []) {
  const owned = collection || {}
  const unlocked = alreadyUnlocked || []
  const newlyUnlocked = []
  for (const ach of COLLECTION_ACHIEVEMENTS) {
    if (unlocked.includes(ach.id)) continue
    const hasAll = ach.requiredCards.every(cardId => owned[cardId] > 0)
    if (hasAll) newlyUnlocked.push(ach)
  }
  return newlyUnlocked
}
