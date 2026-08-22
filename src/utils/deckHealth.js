// 卡组体检 + 一键修正的纯核心（2026-08-22）
//
// 为什么需要它：`generateRecommendedDeck` 曾有个陈旧快照 bug，一键「推荐」会产出**同名 5 张**
// 的卡组（上限 3），保存后照样能「⚔️ 出战」。生成器已修（见 utils/recommendDeck.js），
// 但**已经存进 localStorage 的那些卡组不会自己变好** —— 玩家只会看到一副悄悄违规的牌。
// 所以卡组界面要能：① 一眼看出哪副超限 ② 一键修好。
//
// ☠️ 修正不能只做「削到 3 张」：削完就从 25 张变 23 张，而「⚔️ 出战」要求正好 25 张 ——
//    孩子会发现"我的卡组突然不能出战了"，比原来更糟。所以削完必须**补回 25**，
//    而且只能用他自己拥有的卡。补不满就短着（出战按钮本来就会灰掉，这是诚实的表现）。
import { DECK_SIZE, MAX_SAME_CARD, MAX_SAME_SP } from '../data/deckRules.js'

const countBy = (ids) => (ids || []).reduce((m, id) => (m[id] = (m[id] || 0) + 1, m), {})

/**
 * 体检一副卡组。
 * @returns {null | {overMain: Array, overSp: Array, extra: number}} null = 健康
 */
export function findDeckIssues(slot) {
  if (!slot) return null
  const over = (ids, max) => Object.entries(countBy(ids))
    .filter(([, n]) => n > max)
    .map(([id, n]) => ({ id, count: n, max }))
  const overMain = over(slot.main, MAX_SAME_CARD)
  const overSp = over(slot.sp, MAX_SAME_SP)
  if (overMain.length === 0 && overSp.length === 0) return null
  // extra = 一共多出几张（给界面显示「有 N 张超出上限」）
  const extra = [...overMain, ...overSp].reduce((s, o) => s + (o.count - o.max), 0)
  return { overMain, overSp, extra }
}

/**
 * 一键修正：削到上限，再把主卡组补回 DECK_SIZE。
 * @param {object} slot 卡组 { name, main: string[], sp: string[] }
 * @param {string[]} ownedMainIds 玩家拥有的主卡组卡 id（为空则只用卡组里已有的卡回填）
 */
export function repairDeck(slot, ownedMainIds = []) {
  if (!slot) return slot
  // 削：保留每张卡的前 max 份，顺序稳定（同一副牌修两次结果必须一样 —— 守卫钉死幂等）
  const trim = (ids, max) => {
    const seen = {}
    return (ids || []).filter(id => (seen[id] = (seen[id] || 0) + 1) <= max)
  }
  const main = trim(slot.main, MAX_SAME_CARD)
  const sp = trim(slot.sp, MAX_SAME_SP)

  // 补：先补这副牌里**已经有的**卡（保住它原本的性格），再补玩家拥有的其它卡。
  // ⚠️ 只能补玩家真拥有的 —— 补出一张他没有的卡，等于卡组里混进幽灵，进战斗才炸。
  const owned = new Set(ownedMainIds)
  const inDeck = [...new Set(main)].filter(id => owned.size === 0 || owned.has(id))
  const others = ownedMainIds.filter(id => !inDeck.includes(id))
  for (const id of [...inDeck, ...others]) {
    while (main.length < DECK_SIZE && main.filter(x => x === id).length < MAX_SAME_CARD) {
      main.push(id)
    }
    if (main.length >= DECK_SIZE) break
  }

  return { ...slot, main, sp }
}

/** 一次体检所有槽位，返回有问题的槽位下标 */
export function findUnhealthySlots(slots) {
  return (slots || []).map((s, i) => (findDeckIssues(s) ? i : -1)).filter(i => i >= 0)
}
