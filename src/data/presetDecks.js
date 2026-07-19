// PvP 预设主题卡组 —— 每阵营一套，开箱即玩、零建组（亲子友好）。
//
// buildFactionDeck：**生物+事件混编**（同测试卡组的 ~18 生物 + 7 事件比例）——
//   先塞该系 4 张主题事件（凑到 EVENT_TARGET，找回玩法维度 + 知识点），再按 costTargets 铺生物、
//   兜底填满 DECK_SIZE，全程**严格不超 MAX_SAME_CARD**（逐张 countOf 校验，保证合法）。
// 导出**ID 数组**（不预解析）→ 和存档/guest 卡组走同一条 resolveDeck 路径；日后可手改 ID 与齐齐调平衡。
import cards from './cards.js'
import eventCards from './eventCards.js'
import spCards from './spCards.js'
import { FACTIONS, DECK_SIZE, SP_DECK_SIZE, MAX_SAME_CARD } from './deckRules.js'

// 各 cost 段的目标张数（照抄 DeckBuilder 的 costTargets 曲线感；DECK_SIZE 上限自然把生物填到 25-事件数）。
const COST_TARGETS = { 1: 6, 2: 6, 3: 5, 4: 4, 5: 2 }
// 事件卡目标张数（每系仅 4 张 distinct → 靠 ≤3 张同名凑到 7，同测试卡组的 7 事件）。
const EVENT_TARGET = 7

function buildFactionDeck(faction) {
  const bioPool = cards
    .filter(c => c.type === 'character' && c.faction === faction)
    .sort((a, b) => a.cost - b.cost)
  const evtPool = eventCards.filter((c) => c.faction === faction)
  const main = [] // ids（生物+事件混编）
  const countOf = (id) => main.filter((x) => x === id).length
  const tryFill = (candidates, cap) => {
    let added = 0
    let progress = true
    // 多轮扫候选，每张能加就加（受 MAX_SAME_CARD 限），直到达标/池尽
    while (added < cap && main.length < DECK_SIZE && progress) {
      progress = false
      for (const c of candidates) {
        if (added >= cap || main.length >= DECK_SIZE) break
        if (countOf(c.id) < MAX_SAME_CARD) { main.push(c.id); added++; progress = true }
      }
    }
  }
  // 1) 先塞该系事件卡（找回玩法维度 + 知识点）
  tryFill(evtPool, EVENT_TARGET)
  // 2) 生物卡按 cost 曲线铺
  for (const [cost, target] of Object.entries(COST_TARGETS)) {
    tryFill(bioPool.filter((c) => c.cost === Number(cost)), target)
  }
  // 3) 兜底填满（任意生物）
  tryFill(bioPool, DECK_SIZE)

  const sp = spCards
    .filter((c) => c.faction === faction)
    .slice(0, Math.min(3, SP_DECK_SIZE))
    .map((c) => c.id)

  return { main, sp }
}

// 四阵营各一套。id 稳定（可作 React key / 未来存档引用）。
export const PRESET_DECKS = ['nature', 'body', 'pathogen', 'tech'].map((faction) => {
  const { main, sp } = buildFactionDeck(faction)
  const f = FACTIONS[faction]
  return { id: `preset_${faction}`, faction, name: f.name, icon: f.icon, color: f.color, main, sp }
})
