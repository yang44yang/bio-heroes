// 卡组 ID → 完整卡对象的共享解析器。
//
// 抽自 testDecks.js 的 byId/spById —— **预设卡组 / 玩家存档卡组 / guest 经中继发来的卡组
// 都走这一条**。产出交给 useHand（它按 c.id 铸 uid，需要完整卡字段）。
// 卡组在存储/传输层一律是 **ID 数组**（省流量、和 bio-heroes-decks 存档同形），只在开战边界解析一次。
import cards from './cards.js'
import eventCards from './eventCards.js'
import spCards from './spCards.js'

// 主卡组 = 生物卡(character) + 事件卡混编（deckRules 设计）→ 两处都查
function byId(id) {
  return cards.find(c => c.id === id) || eventCards.find(c => c.id === id)
}
function spById(id) {
  return spCards.find(c => c.id === id)
}

export function resolveMain(ids) {
  return (ids || []).map(id => byId(id)).filter(Boolean)
}

export function resolveSp(ids) {
  return (ids || []).map(id => spById(id)).filter(Boolean)
}

// { main:[ids], sp:[ids] } → { mainCards:[objs], spCards:[objs], ids:{main,sp} }
// 解析不到的 ID（卡被删/改名）由 .filter(Boolean) 丢弃 → 可能 < DECK_SIZE，调用方按需校验长度。
//
// ⚠️ `ids` 原样带回来，是给**续局**用的（host 自恢复）：useHand 在首渲染就把卡组冻进 ref
//    并按**原始下标**铸 uid（`${side}_${cardId}_${index}`）。恢复时必须传回**同一副 ID 数组**，
//    否则新实例铸出的 uid 与快照里的对不上 —— 而 summoned/attacked/弃牌堆标记全是按 uid 查表的，
//    对不上就是静默认错卡。带上 ids 让「存的是什么、恢复用什么」是同一份东西。
export function resolveDeck(deck) {
  return {
    mainCards: resolveMain(deck?.main),
    spCards: resolveSp(deck?.sp),
    ids: { main: deck?.main || [], sp: deck?.sp || [] },
  }
}
