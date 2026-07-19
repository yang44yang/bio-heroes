// PvP 大厅协议 —— guest→host 的「卡组帧」。
//
// ☠️ **刻意不进 wire.js**：wire.js 的 MSG 冻结为 sync/intent/resume 三种（对局**状态**协议），
//    改它要 bump PROTOCOL_VERSION + 动一堆 wire 测试。卡组帧是**开局前的大厅帧**，不是权威对局状态
//    —— 不属于那里。放这儿：wire.js 保持冻结、所有 wire 测试不受影响。
//
// 传输零改动：relayClient 把 t 非 `relay.*` 的帧路由到 onGame（'deck' 不撞 relay.* / sync|intent|resume）；
// 中继盲转、不解析内容。方向仅 guest→host（guest 不跑引擎、不需 host 卡组）。
// 传 ID 数组即可 —— host 权威本就要握 guest 抽牌堆，非隐私回退。
import { DECK_SIZE, SP_DECK_SIZE } from '../data/deckRules.js'

export const DECK_FRAME = 'deck'

// 只做「结构合法 + 反滥用上限」粗校验（防畸形/超大帧）；**精确张数/合法性由 resolveDeck + 开战门控兜**
//   （decodeDeckFrame 失败 → host 的 guestDeckReady 保持 false → 开战按钮继续挡住，fail-safe）。
const isIdArray = (a, cap) =>
  Array.isArray(a) && a.length <= cap && a.every((x) => typeof x === 'string' && x.length > 0 && x.length <= 64)

export function encodeDeckFrame({ main, sp }) {
  return { t: DECK_FRAME, main: main || [], sp: sp || [] }
}

export function decodeDeckFrame(raw) {
  if (!raw || raw.t !== DECK_FRAME) return { ok: false }
  if (!isIdArray(raw.main, DECK_SIZE) || !isIdArray(raw.sp, SP_DECK_SIZE)) return { ok: false }
  return { ok: true, main: raw.main, sp: raw.sp }
}
