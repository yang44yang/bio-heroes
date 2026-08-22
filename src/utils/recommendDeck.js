// 一键「推荐」卡组的纯核心（从 DeckBuilder.jsx 抽出来，2026-08-22）
//
// 为什么要抽出来：它是**新玩家做的第一件事**（空卡组 → 新建 → 推荐 → 出战），
// 而它原来埋在 .jsx 里，Node 起不来 renderer → 一行测试都没有。实测它会生成
// **同名 5 张**的非法卡组（上限 3），保存后还能直接「⚔️ 出战」。
// 现在它是纯函数，scripts/test-deck-recommend.mjs 用**真实初始礼包**跑它。
//
// ⚠️ 相对 import 必须带 .js —— 漏了就等于把本文件锁在 npm test 之外。
import { DECK_SIZE, SP_DECK_SIZE, MAX_SAME_CARD } from '../data/deckRules.js'

/**
 * 按「主阵营 + 副阵营」从**玩家拥有的**卡池里凑一副主卡组 + SP 卡组。
 * @param {string} factionPrimary
 * @param {string} factionSecondary
 * @param {Array}  mainPool 玩家拥有的主卡组可选卡（生物卡 + 事件卡）
 * @param {Array}  spPool   玩家拥有的 SP 卡
 * @returns {{main: string[], sp: string[]}} 卡 id 数组（可重复 = 份数）
 */
export function generateRecommendedDeck(factionPrimary, factionSecondary, mainPool, spPool) {
  const main = []
  const pool = mainPool
    .filter(c => c.faction === factionPrimary || c.faction === factionSecondary)
    .sort((a, b) => a.cost - b.cost)

  const costTargets = { 1: 6, 2: 6, 3: 5, 4: 4, 5: 2 }
  for (const [cost, count] of Object.entries(costTargets)) {
    for (let i = 0; i < count && main.length < DECK_SIZE; i++) {
      // ☠️ 候选必须**每一张都重算**。原来 candidates 在这个循环外面只算一次，那句
      //    「同名 < MAX_SAME_CARD」用的是**空卡组的陈旧快照** —— 该费用段只有一张候选时
      //    （新玩家 body+tech 的 cost 3 就是），i % 1 一直取同一张，目标要几张就塞几张，
      //    实测给出「皮肤·第一道防线 ×5」，而且保存后照样能「⚔️ 出战」。
      //    别为了省几次 filter 把它挪回去（scripts/test-deck-recommend.mjs ① / ② 会当场变红）。
      const candidates = pool.filter(c => c.cost === Number(cost)
        && main.filter(m => m.id === c.id).length < MAX_SAME_CARD)
      if (candidates.length === 0) break
      main.push(candidates[i % candidates.length])
    }
  }
  while (main.length < DECK_SIZE) {
    const fill = pool.find(c => main.filter(m => m.id === c.id).length < MAX_SAME_CARD)
    if (!fill) break
    main.push(fill)
  }

  const sp = spPool
    .filter(c => c.faction === factionPrimary || c.faction === factionSecondary)
    .slice(0, Math.min(3, SP_DECK_SIZE))

  return { main: main.map(c => c.id), sp: sp.map(c => c.id) }
}
