// 主题成就 — 集齐一组主题卡 → 解锁徽章 + 科学知识包
// 卡片 ID 已对照 cards.js / spCards.js 验证存在
import { getTotalStars } from './campaignData.js'

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
  {
    // 🌊 海洋深渊 S1 扩展包「集齐奖励」——requiredCards 必须是真正的 set:"OCEAN" 卡
    // （dexSets.OCEAN.rewardAchId 指向此成就；过去误指 apex_predator，三张全 BASE，集齐 OCEAN 无进度）
    id: 'ocean_abyss',
    name: '深渊探索者',
    icon: '🌊',
    requiredCards: ['tube_worm_vent', 'giant_squid', 'sperm_whale'],
    reward: {
      type: 'science_pack',
      title: '📚 深海里没有阳光，生命靠什么活？',
      content: `海洋最深处一片漆黑，太阳光根本照不到。可那里照样热闹！

🌋 海底热泉喷出滚烫的含硫气体，管虫体内的细菌能"吃"这些化学物质造出食物——
不靠阳光、靠化学，这叫"化能合成"，是另一套完全不同的生命能量来源。
🦑 大王乌贼在黑暗里游弋，眼睛大得像篮球，专门在没有光的深海中捕猎。
🐋 抹香鲸能一口气潜到 2000 米深、屏息一个多小时，就为了猎捕大王乌贼——
这场巨兽之战，就发生在阳光永远照不到的地方。

深海告诉我们：只要有能量来源，哪怕没有一丝阳光，生命也能找到活下去的办法。`,
    },
  },
  {
    // 🔬 微观战场 S2 扩展包「集齐奖励」——requiredCards 必须是真正的 set:"MICRO" 卡
    // （dexSets.MICRO.rewardAchId 指向此成就；过去误指 microbe_explorer，三张全 BASE）
    id: 'micro_battlefield',
    name: '微观世界向导',
    icon: '🔬',
    requiredCards: ['cyanobacteria_oxygen', 'chloroplast_solar_forge', 'euglena'],
    reward: {
      type: 'science_pack',
      title: '📚 你呼吸的氧气，是小到看不见的生命造的',
      content: `🫧 几十亿年前，地球空气里几乎没有氧气。是蓝细菌学会了"光合作用"——
用阳光、水和二氧化碳造糖，顺便放出氧气，一点点把天空变成我们能呼吸的样子。
🌱 后来，一个蓝细菌"住进"了别的细胞里不走了，变成今天植物细胞里的"叶绿体"——
所以每一片叶子里，都藏着远古细菌的后代。
🦠 眼虫更有趣：有光时它像植物一样晒太阳造食物，没光时又像动物一样游出去找吃的，两边都占。

微观世界虽然看不见，却造出了整个地球的氧气，也藏着生命演化最奇妙的故事。`,
    },
  },
]

// ============================================================
// 战斗成就 + 答题成就（成就三类：收集 / 战斗 / 答题）
// 声明式 check(ctx) 谓词，ctx = { stats, stageStars, battleResult }
// ============================================================

// 各章 Boss 关卡 ID（与 App.jsx handleExitBattle 的 chapterMap 同步）
// stage_2_8 新冠病毒 / stage_3_8 蓝鲸巨灵 / stage_4_8 超级细菌
export const BOSS_STAGE_IDS = ['stage_2_8', 'stage_3_8', 'stage_4_8']

export const BATTLE_ACHIEVEMENTS = [
  {
    id: 'first_victory',
    name: '初战告捷',
    icon: '⚔️',
    category: 'battle',
    reward: { type: 'badge_only' },
    check: (ctx) => !!ctx.battleResult?.won, // 本场事件型 — 无 progress
  },
  {
    id: 'battle_veteran',
    name: '百战老兵',
    icon: '🎖️',
    category: 'battle',
    reward: { type: 'badge_only' },
    check: (ctx) => (ctx.stats?.battlesWon || 0) >= 10,
    progress: (ctx) => ({ have: Math.min(ctx.stats?.battlesWon || 0, 10), total: 10 }),
  },
  {
    id: 'flawless_victory',
    name: '完美防守',
    icon: '🛡️',
    category: 'battle',
    reward: { type: 'badge_only' },
    // ⚠️ leaderHPPercent 是 0-100，满血通关 = 100（不是 1）
    check: (ctx) => !!ctx.battleResult?.won && (ctx.battleResult?.leaderHPPercent || 0) >= 100,
  },
  {
    id: 'boss_slayer',
    name: '巨兽终结者',
    icon: '👑',
    category: 'battle',
    reward: {
      type: 'science_pack',
      title: '📚 你战胜的三大终极考验',
      content: `你击败了三个最强的对手——它们各自代表生命科学里最难的挑战：

🦠 新冠病毒：看不见的病原，却能改变整个世界。但人类用疫苗和抗体反击——科学让我们不再害怕。

🐋 蓝鲸巨灵：地球上最大的动物。真正的强者懂得，海洋巨兽不是敌人，而是要守护的伙伴，敬畏自然才是最大的力量。

🦠 超级细菌：滥用抗生素养出的怪物。它警告我们：用错药会让细菌进化得更强，这是人类自己制造的难题。

打败它们，说明你不只会战斗，更读懂了背后的科学！`,
    },
    check: (ctx) => BOSS_STAGE_IDS.every(id => (ctx.stageStars?.[id] || 0) >= 1),
    progress: (ctx) => ({
      have: BOSS_STAGE_IDS.filter(id => (ctx.stageStars?.[id] || 0) >= 1).length,
      total: BOSS_STAGE_IDS.length,
    }),
  },
  {
    id: 'star_shine',
    name: '闪耀星河',
    icon: '⭐',
    category: 'battle',
    reward: { type: 'badge_only' },
    // 走 getTotalStars：只数当前关卡星，防幽灵 key（旧格式 1-N 等）让成就提前解锁
    check: (ctx) => getTotalStars({ stageStars: ctx.stageStars }) >= 30,
    progress: (ctx) => {
      const stars = getTotalStars({ stageStars: ctx.stageStars })
      return { have: Math.min(stars, 30), total: 30 }
    },
  },
]

export const QUIZ_ACHIEVEMENTS = [
  {
    id: 'quiz_first',
    name: '求知初心',
    icon: '📖',
    category: 'quiz',
    reward: { type: 'badge_only' },
    check: (ctx) => (ctx.stats?.quizCorrectTotal || 0) >= 1,
  },
  {
    id: 'quiz_scholar',
    name: '答题学霸',
    icon: '🎓',
    category: 'quiz',
    reward: { type: 'badge_only' },
    check: (ctx) => (ctx.stats?.quizCorrectTotal || 0) >= 20,
    progress: (ctx) => ({ have: Math.min(ctx.stats?.quizCorrectTotal || 0, 20), total: 20 }),
  },
  {
    id: 'quiz_master',
    name: '知识大师',
    icon: '🧠',
    category: 'quiz',
    reward: {
      type: 'science_pack',
      title: '📚 为什么要懂原理',
      content: `你已经答对了 100 道题！但比"答对"更重要的，是"为什么"。

💤 死记硬背：记住"抗生素治细菌"——考完就忘。
💡 理解原理：明白"抗生素破坏细菌的细胞壁，病毒没有细胞壁，所以治不了感冒"——一辈子忘不掉。

科学家和普通人最大的区别，不是记住更多答案，而是遇到没见过的问题时，能用原理推理出答案。

下次答题，多问自己一个"为什么"，你就在像科学家一样思考了！`,
    },
    check: (ctx) => (ctx.stats?.quizCorrectTotal || 0) >= 100,
    progress: (ctx) => ({ have: Math.min(ctx.stats?.quizCorrectTotal || 0, 100), total: 100 }),
  },
  {
    id: 'quiz_perfect_run',
    name: '全对达人',
    icon: '💯',
    category: 'quiz',
    reward: { type: 'badge_only' },
    // 单场 ≥3 题且全对（quizTotal 由 BattleScreen 转发）
    check: (ctx) => (ctx.battleResult?.quizTotal || 0) >= 3 &&
      ctx.battleResult?.quizCorrect === ctx.battleResult?.quizTotal,
  },
]

// 给 collection 成就合成 category + check/progress，使 ALL_ACHIEVEMENTS 渲染路径统一
for (const ach of COLLECTION_ACHIEVEMENTS) {
  ach.category = 'collection'
  ach.check = (ctx) => ach.requiredCards.every(id => (ctx.collection || {})[id] > 0)
  ach.progress = (ctx) => ({
    have: ach.requiredCards.filter(id => (ctx.collection || {})[id] > 0).length,
    total: ach.requiredCards.length,
  })
}

// 三类全集（供 Collection 分组展示）
export const ALL_ACHIEVEMENTS = [
  ...COLLECTION_ACHIEVEMENTS,
  ...BATTLE_ACHIEVEMENTS,
  ...QUIZ_ACHIEVEMENTS,
]

// 通用检测引擎：返回 pool 中 check 通过且未解锁的成就对象数组（不修改 state）
export function detectNewlyUnlockedFrom(pool, ctx, alreadyUnlocked = []) {
  const unlocked = alreadyUnlocked || []
  const out = []
  for (const ach of pool) {
    if (unlocked.includes(ach.id)) continue
    let ok = false
    try { ok = !!ach.check(ctx) } catch { ok = false }
    if (ok) out.push(ach)
  }
  return out
}

// 向后兼容：GachaScreen.jsx 调用签名不变（只查 collection 成就的集卡条件）
export function detectNewlyUnlocked(collection, alreadyUnlocked = []) {
  return detectNewlyUnlockedFrom(COLLECTION_ACHIEVEMENTS, { collection: collection || {} }, alreadyUnlocked)
}
