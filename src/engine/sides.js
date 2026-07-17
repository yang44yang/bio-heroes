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

/**
 * mirror —— 把一个局面翻到**对面的座位**上看。PvP 的 wire 边界就靠它。
 *
 * ## 为什么它只有几行
 * 因为 `battleReducer` 的状态树是 **side-keyed 而非 viewpoint-keyed**：
 * `{turn, activeSide, winner, player:{…}, enemy:{…}}`，两棵子树**结构全等**。
 * 于是「让 guest 看见自己在下方」不需要给 BattleScreen 里那 ~40 处 `battle.player*`
 * 加任何 `mySide` 间接层 —— 交换子树，那些读取**零改动自动正确**。
 * （侦察时把「视角镜像」标成了 PvP 最大风险；实际它是**边界问题，不是代码库问题**。）
 *
 * ## ⚠️ 三样必须一起翻，漏一样都会静默出错
 * - 两棵子树（显然）
 * - `activeSide`（轮到谁）
 * - `winner`（谁赢了）
 * 后两个是**带侧别语义的顶层标量**。而它们最阴的地方是：
 * **对合测试 `mirror(mirror(s)) === s` 对「漏翻」是结构性瞎的** —— 它们是 swap 的
 * **不动点**，漏翻照样 round-trip 恒等、断言照样绿。
 * 漏翻 winner 的线上后果是：**输的那个孩子看到胜利画面**。
 * 所以 scripts/test-side-symmetry.mjs 的 ⓪ **逐字段显式断言翻转**，不只做 round-trip。
 *
 * ## ☠️ 它同时是「什么是公开的」这条不变式的执行者
 * 本函数的产物会被**整棵推给对手**。所以：**凡进 reducer 的东西 = 公开的。**
 * 已核实 BattleScreen 只渲染 `enemySpDeck.length`（数量）→ SP 卡组**内容是隐藏信息**；
 * 手牌同理（它们不在 reducer 里，**永远不该进去** —— host 的浏览器本就持有 guest 的手牌）。
 * 私有数据走 wire 的**私有通道**，不走这里。往 reducer 里提升任何东西之前，先问：
 * **我愿意让对面小孩看见它吗？**
 *
 * @param {Object} s - battleReducer 的 state（整棵）
 * @returns {Object} 同构的新 state，两侧对调
 */
export function mirror(s) {
  return {
    ...s,
    activeSide: s.activeSide === PLAYER ? ENEMY : PLAYER,
    winner: s.winner == null ? null : (s.winner === PLAYER ? ENEMY : PLAYER),
    player: structuredClone(s.enemy),
    enemy: structuredClone(s.player),
  }
}
