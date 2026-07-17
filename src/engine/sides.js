// sides.js —— 「方」的唯一词汇表。
//
// 为什么单独一个文件（2026-07-17，de-fork S1）：
//   引擎里 'player'/'enemy' 这两个字符串到处都是裸字面量。把它们收成常量本身价值不大 ——
//   真正的价值是 opp()：「对面是谁」此前每次都现写 `side === 'player' ? 'enemy' : 'player'`，
//   而 de-fork 之后这个表达式会出现在每一条规则里。写错一次 = 伤害打到自己人，且静默。
//
// ⚠️ 本文件必须保持零 import、纯常量 + 纯函数 —— rules.js / battleReducer.js 都要用它，
//    而那两个是「React-free、Node 可直接 import」的（scripts/test-*.mjs 直测它们）。
//
// ⚠️ 必须带 .js 扩展名 import 本模块：Node 的 ESM 不做扩展名补全（Vite 会）。
//    漏了扩展名 → build 照过、只有 npm test 会红。同侧参照 engine/battleReducer.js:24-26。

export const PLAYER = 'player'
export const ENEMY = 'enemy'

/** 两侧的稳定顺序。遍历双方时用它，别手写数组字面量。 */
export const SIDES = [PLAYER, ENEMY]

/**
 * 对面是谁。
 *
 * 刻意对非法输入抛错而不是静默返回某一侧：这个函数的返回值会被直接拿去索引
 * state[...]，`undefined` 会一路飘到 `Cannot read properties of undefined`，
 * 而那个报错离真正的错误现场已经很远了。在源头响。
 *
 * @param {'player'|'enemy'} side
 * @returns {'player'|'enemy'}
 */
export function opp(side) {
  if (side === PLAYER) return ENEMY
  if (side === ENEMY) return PLAYER
  throw new Error(`opp: side 必须是 '${PLAYER}' 或 '${ENEMY}'，收到 ${JSON.stringify(side)}`)
}

/** 是不是合法的一侧。守卫入参用。 */
export function isSide(v) {
  return v === PLAYER || v === ENEMY
}
