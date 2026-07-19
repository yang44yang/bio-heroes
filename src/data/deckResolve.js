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

// { main:[ids], sp:[ids] } → { mainCards:[objs], spCards:[objs] }
// 解析不到的 ID（卡被删/改名）由 .filter(Boolean) 丢弃 → 可能 < DECK_SIZE，调用方按需校验长度。
export function resolveDeck(deck) {
  return {
    mainCards: resolveMain(deck?.main),
    spCards: resolveSp(deck?.sp),
  }
}
