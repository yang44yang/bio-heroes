// wire.js —— PvP 的**消息形状**。host 权威、guest 瘦客户端、中继只转发。
//
// ## 为什么它是纯函数 + 冻结白名单，一行状态都没有（2026-07-17，PvP 第 1 步）
//
// 这个模块的工作**不是「传状态」，是用形状消灭整类失效**。凡是「靠 host 记得检查」的
// 安全性，这里一律改写成「在形状上不可表达」—— 因为「记得检查」活在一行 if 里，而那行 if
// 会在三个月后某次「让本地热座也能用」的重构里变成 `raw.side ?? seat`，静默、build 通过、
// 只有齐齐和他对手真机对战时回合被偷走。**不存在的字段伪造不了。**
//
// 具体兑现成三条：
//   · intent **没有 side 字段**（不是「host 忽略它」—— guest 无处可写）
//   · 私有载荷是 `sources[to]` 这**一个索引表达式**的产物（不是参数）→「把 player 的手牌
//     发给 enemy」在调用点写不出来
//   · 通道① 是**公开性的守门人**（assertPublicShape 抛错），不是透明管道 + 一句注释
//
// ## ☠️ 三条约束，破一条就不再是这个模块
//   ① **零 React、零 IO、零状态。** 中继（第 3 步，Node 无打包器）要裸 import 它。
//   ② **必须 side-blind**：只用 sides.js 的 PLAYER/ENEMY 常量，不写侧别字面量。
//      test-no-side-fork.mjs 的 (a) 清单守着 —— 一个**不能命名某一侧的模块，在结构上就
//      无法偏袒某一侧**。这比测试更接近结构定理。
//   ③ **wire 管形状，rules.js 管合法性。** 这里没有一行规则判断：`{atkSlot: 999}` 形状合法
//      → 原样交给 host → 由 canAttackFrom 拒掉。两者混在一起 = 规则有了第二个真相源。
//
// ## ⚠️ 必须带 .js 扩展名 import
//    Node 的 ESM 不做扩展名补全（Vite 会）。漏了 → build 照过、只有 npm test 会红。
//    同侧参照 engine/battleReducer.js:24-26。
//
// ## 本模块**不做**的事（刻意，见 SESSION.md 的 PvP 步骤表）
//   · 不接中继、不接 UI、不改 useBattle、不动 useAITurn
//   · 33 个 skillEvent 内部 type → 表现事件的投影（projectSkillEvent）留给第 4 步，
//     与它的消费者一起写、一起对着真 skillRegistry.execute 测 —— 今天写它，fixture 只能
//     手搓「长得像」的对象，而那正是本项目被烧过六次的那个错。

import { PLAYER, ENEMY, opp, isSide, mirror } from './sides.js'
import { MAX_FIELD_SLOTS } from '../data/deckRules.js'

// ================================================================
//  常量 —— 全部冻结。它们是协议本身，不是配置。
// ================================================================

/**
 * 协议版本。单调整数。**任何形状变更必须 bump。**
 *
 * ☠️ 为什么它非有不可：两个孩子的标签页会**跨过一次 `npm run deploy`**（自有 VPS，
 *    build + rsync，客户端不自刷新）。没有 v，形状对撞的表现是「棋盘静默地不对」
 *    （空手牌 / NaN HP / 白屏），而 host 侧一切正常；有了 v，它是一句「请刷新」。
 *
 * 光有版本号不是棘轮（`1 === 1` 恒绿，最小修复是「把清单改一行」）。真正的棘轮是
 * SHAPES[PROTOCOL_VERSION] —— **版本编进形状本身，不 bump 就绿不了**。
 */
export const PROTOCOL_VERSION = 3

/**
 * 事件环封顶。**测试从这里 import，不写字面量**（写死 = 让「环有多长」多一个真相源）。
 *
 * ☠️ **不是 64。** 实测量级：一次攻击 ≈ 1 log + 2 float + 1 fx ≈ 4 条；满场 6 次攻击 ≈ 24；
 *    AOE 对满场 6 目标 = 12；再加出牌 log + onPlay 技能事件 + statusEffects 的每回合 tick
 *    + 环境事件 —— **单个大回合 40-60 条是常态，64 是踩线，不是余量。**
 *    64 原是按「重连丢多少动画可以接受」选的数；而一旦 since 是 host 自己的水位
 *    （见 buildSync 的 since 语义），CAP 就**只影响重连的补播深度** —— 留余量是免费的。
 */
export const EVENT_RING_CAP = 192

/**
 * 主人的 slot 编码。与既有约定**逐字一致**（BattleScreen 的 showFloat、attack 的 defSlot）。
 * ⚠️ 它同时是「反查失败」的返回值（findIndex 找不到 → -1）—— 这个撞车是第 4 步要清的账，
 *    不是这里能修的。本模块只保证：**环上的 slot 由 host 当场解析好，guest 零反查。**
 */
export const LEADER_SLOT = -1

/** 消息类型。三种，全部。没有第四种。 */
export const MSG = Object.freeze({ SYNC: 'sync', INTENT: 'intent', RESUME: 'resume' })

// ---------------- intent（guest → host）----------------

/**
 * guest 能表达的**全部**动作。冻结枚举 —— **不是转发任意方法名**。
 *
 * ☠️ 白名单即能力面。不在这里的东西，guest 说不出来：
 *   · `preplace` —— preplaceCard 是作弊入口，**绕过全部规则**。能表达它 = guest 凭空摆任意卡
 *   · `addLog` / `startBattle` / `startPlayerTurn` / `setPlayerField` / `pushSkillEvents`
 *     —— 编排与生命周期，不是玩家动作
 *   · `tryQuiz` —— 不是 intent，是 attack intent 的**服务端副作用**（host 收到 attack 时自己判）
 *   · `dismissEnv` —— 确认权在 PvP 里**语义未决**（双方都点掉才继续？host 单方推进？）。
 *     为未决的语义定字段 = 定一个没有断言的字段
 *   · `concede` —— 引擎里**没有认输的概念**（只有 GAME_OVER {winner}）。第 5 步的账
 */
export const INTENT_KINDS = Object.freeze([
  'play', 'playEvent', 'attack', 'answer', 'mulligan',
  'endMain', 'endTurn', 'breakBank', 'spChoose',
])

/**
 * decodeIntent 的**投影表**。按它逐字段重建 —— **不是校验后透传**。
 *
 * ☠️ 注意这里**没有** side / seat / owner / awakenOpts / damageMultiplier / card：
 *   · side/seat/owner —— 座位由**连接**给，guest 从不自选（见 decodeIntent）
 *   · awakenOpts/damageMultiplier —— 今天 BattleScreen 在**客户端**算科学家模式的 1.2 倍并
 *     把 answerQuiz 的返回原样透传给 attack。guest 能发就能发 {damageMultiplier: 999}。
 *     host 按自己权威的 quiz 结果重算 —— 而「重算」不会被忘记，**因为参数根本传不进来**。
 *   · card —— 整张卡 = guest 能伪造卡面。发 uid，host 在**自己持有的** hands[seat] 里 find。
 *
 * ⚠️ 参数一律用 uid，不用 index：index 会被抽牌/mulligan 重排（易腐）。
 *    host 的浏览器**确实**持有 guest 的手牌（BattleScreen 把两副手牌数组本体注入 setHandRefs）。
 */
export const INTENT_FIELDS = Object.freeze({
  play: Object.freeze(['uid', 'slot']),
  playEvent: Object.freeze(['uid']),
  attack: Object.freeze(['atkSlot', 'defSlot']),
  answer: Object.freeze(['qid', 'choice']),
  mulligan: Object.freeze(['uids']),
  endMain: Object.freeze([]),
  endTurn: Object.freeze([]),
  breakBank: Object.freeze([]),
  spChoose: Object.freeze(['uid']),
})

// ---------------- 事件环（通道③）----------------

/** 环上的事件种类。闭合词表。 */
export const EVENT_KINDS = Object.freeze(['float', 'fx', 'log', 'reveal', 'boss'])

/**
 * 构造器与 toViewEvent 的**白名单重建表**（不是过滤拷贝）。
 *
 * ☠️ 双守卫，两个一起上，否则守卫就是剧场：
 *   · 构造器 = **入口棘轮**（`_side` 这类键在结构上进不来）
 *   · toViewEvent = **出口白名单**（绕过构造器直接 push 进环的，也出不去）
 *   只有前者 ⇒ 有人直接 ring.push(evt) 就废了；只有后者 ⇒ 下次加 kind 时没人记得。
 */
export const EVENT_FIELDS = Object.freeze({
  float: Object.freeze(['side', 'slot', 'text', 'tone']),
  fx: Object.freeze(['side', 'slot', 'name']),
  log: Object.freeze(['side', 'text']),
  reveal: Object.freeze(['side', 'text', 'cards']),
  boss: Object.freeze(['side', 'slot', 'text', 'tone', 'dialogueKey']),
})

/**
 * 语义色调。**不是 tailwind class。** 两个理由：
 *   ① 表现层不入协议（guest 的渲染层自己决定 -8000 是什么颜色）
 *   ② Tailwind v4 无 config → 扫**全项目**（含 scripts/、含注释）→ 写在协议或测试里的
 *      class 字面量会被编译进生产 CSS 里的死规则。这是 CLAUDE.md 记着的既有教训。
 *
 * ⚠️ 扩展纪律：环是**装饰**，但构造器抛错会炸掉 host 的**权威**路径。第 4 步加新 tone 时
 *    先补这里，或给 emit 层加 try/catch。
 */
export const TONES = Object.freeze(['damage', 'heal', 'buff', 'shield', 'info', 'boss'])

// ---------------- 通道② 私有分发 ----------------

/**
 * 私有载荷的 schema。★ **与另两个通道对称** —— 唯一真正装秘密的通道，不能是唯一没有
 * schema 的那个。buildSync 按它**重建**，不透传。
 *
 * ☠️ 没有 spDeck 字段：实测**两侧** SP 卡组都只被读 `.length`
 *    （BattleScreen:1102-1105 是唯一读取点）→ 内容零消费者 → 不上 wire。
 *    「UI 只显示数量」正是「它是隐藏信息」的证据。
 */
export const SELF_SPEC = Object.freeze(['owner', 'hand', 'drawPileCount', 'spChoice'])

// ---------------- 公开性 ----------------

/**
 * ★ 公开性词表的**唯一真相源**（test-wire-privacy.mjs import 它，不再自带第二份）。
 *
 * 匹配是**子串 + 大小写不敏感** —— 精确匹配会放行 `playerHand` / `enemySpDeck` 这类
 * 真实存在的键名（handsRef 的字面键名就长这样）。
 *
 * 每个词的理由：
 *   · hand/hands/drawPile/deck —— host 的浏览器持有**双方**的手牌。进 reducer = mirror
 *     每推一次就把齐齐的整副手牌寄给他对手。这不是隐私洁癖，这是整个游戏
 *   · spDeck —— 内容是隐藏信息（UI 只显示 .length）
 *   · candidates —— pendingSpSummon 的 SP 候选。在**点选前**就寄给对面 = 提前剧透
 *   · correct / answer —— getRandomQuiz 的返回带 `correct: picked.answer`（quizzes.js:943）。
 *     quizzes.js 本就整个打进 bundle，所以这不算严格意义的隐藏信息 —— 但明送答案会让作弊
 *     从「打开 devtools」降级到「看一眼 network」
 */
export const PRIVATE_KEYS = Object.freeze([
  'hand', 'hands', 'drawPile', 'deck',
  'spDeck', 'spDeckCards',
  'candidates', 'correct', 'answer', 'reveals',
])

/**
 * PRIVATE_KEYS 的子串匹配会误伤的**公开事实**。
 *
 * ⚠️ **误伤是好对话，不是麻烦**：`handCount` 会红 → 那个人被迫在 PR 里说明「我确认张数是
 *    公开的」→ 加进这里。若你确实需要一个叫 `correct` 的公开字段，**请改名，别放宽词表**。
 */
export const PUBLIC_ALLOW = Object.freeze(['handCount', 'drawPileCount'])

/**
 * ★ 顶层**带侧别语义的标量**的完整清单。mirror 只翻这两个 + 两棵子树，其余靠 `...s` 透传
 * （已核 sides.js:71-79）。
 *
 * ☠️ 这个清单是 findSideValuedLeak 的判据，而那条扫描**不点名字段** —— 于是第 2 步一旦有人
 *    在顶层加侧别标量（例如 `state.quiz.answeredBy: 'player'|'enemy'`），**自动红，无需有人
 *    记得**。那个具体的例子不是假想：它曾是被裁定的设计，直到发现 mirror 根本不翻它 ——
 *    齐齐抢答，他的 UI 和 host 的 UI 会**同时**显示「是我抢到的」。
 *    正确的形状是 `state[side].quizAnswered: boolean`（落进每侧子树 → mirror 天然对）。
 */
export const SIDE_VALUED_PATHS = Object.freeze(['activeSide', 'winner'])

/**
 * ★ 形状棘轮的真相源。**版本编进形状本身 → 不 bump 就绿不了。**
 *
 * `<side>.` 前缀 = 两棵子树塌成一条（它们结构全等，那正是 mirror 成立的前提）。
 * 数组塌成叶子（field/discard 装的是卡，卡的形状不归 wire 管）。
 *
 * ☠️ 第 2 步的变异测试就是第 2 步本身：往 initialBattleState.player 加 `quizStreak: 0`
 *    → test-wire-envelope 的 ④ 红 → **唯一能变绿的改法是加 SHAPES[2] 条目 + 把
 *    PROTOCOL_VERSION 改成 2**。改不动、绕不过。
 */
export const SHAPES = Object.freeze({
  1: Object.freeze([
    '<side>.attacked',
    '<side>.discard',
    '<side>.energy',
    '<side>.field',
    '<side>.leaderHp',
    '<side>.phase',
    '<side>.powerBank.intact',
    '<side>.powerBank.stored',
    '<side>.summoned',
    'activeSide',
    'turn',
    'winner',
  ]),
  // v2（PvP 第 2 步）：quizStreak / scientistMode 从 useBattle 的 ref+useState 提进每侧子树。
  // 它们**天然是公开的**：BattleScreen 今天就把 🧠×N 和「🔬 科学家模式！」渲染在屏幕上给对手看，
  // 且科学家模式的 +20% 会体现在伤害数字里 —— 藏它没有意义，藏了反而让对手算不明白挨了多少。
  //
  // ★ 这条版本就是棘轮生效的实证：加字段的那一刻 assertPublicShape 当场抛错，报错里直接列出了
  //   新形状。**绕不过、也不用谁记得** —— 这正是「版本编进形状本身」买到的东西。
  2: Object.freeze([
    '<side>.attacked',
    '<side>.discard',
    '<side>.energy',
    '<side>.field',
    '<side>.leaderHp',
    '<side>.phase',
    '<side>.powerBank.intact',
    '<side>.powerBank.stored',
    '<side>.quizStreak',
    '<side>.scientistMode.active',
    '<side>.scientistMode.turnsLeft',
    '<side>.summoned',
    'activeSide',
    'turn',
    'winner',
  ]),
  // v3（handCount 步）：手牌张数提进每侧子树。内容仍是隐私（PRIVATE_KEYS 挡 hand/hands），
  // 张数是公开事实（PUBLIC_ALLOW 已列 handCount，privacy 检查放行）。guest 的 enemyHand.hand 是空的
  // → 对手手牌数只能读这个公开字段（此前恒显示 0）。
  3: Object.freeze([
    '<side>.attacked',
    '<side>.discard',
    '<side>.energy',
    '<side>.field',
    '<side>.handCount',
    '<side>.leaderHp',
    '<side>.phase',
    '<side>.powerBank.intact',
    '<side>.powerBank.stored',
    '<side>.quizStreak',
    '<side>.scientistMode.active',
    '<side>.scientistMode.turnsLeft',
    '<side>.summoned',
    'activeSide',
    'turn',
    'winner',
  ]),
})

// ================================================================
//  局次 / 视角
// ================================================================

/**
 * 每局 startBattle 时铸一个。
 *
 * 纯：**接一个熵源，不自己调 Date.now()** —— 否则它不可测，而它是 readEvents 的换局判据。
 * @param {number} entropy
 */
export function mintMatchId(entropy) {
  if (!Number.isFinite(entropy)) throw new Error(`mintMatchId: entropy 必须是有限数，收到 ${JSON.stringify(entropy)}`)
  return `m_${Math.abs(Math.trunc(entropy)).toString(36)}`
}

/**
 * 视角变换。**收件人永远是 state.player。**
 *
 * 于是 BattleScreen 那 ~40 处 `battle.player*` 在两侧**零改动**自动正确 —— 这正是
 * side-keyed（而非 viewpoint-keyed）状态树买来的东西。
 *
 * ☠️ structuredClone 不能省。省了 sync.state 就是**活 state 的别名**：消息在发送队列里
 *    等待时会跟着 host 后续的 dispatch 变，guest 收到的是「未来的棋盘」。
 *
 * @param {'player'|'enemy'} to 收件人的绝对座位
 */
export function viewFor(to, state) {
  if (!isSide(to)) throw new Error(`viewFor: to 必须是合法的一侧，收到 ${JSON.stringify(to)}`)
  return to === PLAYER ? structuredClone(state) : mirror(state)
}

/**
 * 事件环的 mirror。**翻译只在这一处发生。**
 *
 * mirror() 翻快照，toViewSide 翻环 —— 一处翻，不是五处。今天这个翻译**手工散在 5 处**
 * （BattleScreen 的浮字路由 / useAITurn 的浮字路由 / BattleScreen 的日志前缀 —— 互为镜像的
 * 拷贝）。那是 PvP 最大的隐藏 fork。
 *
 * ☠️ **seat === PLAYER 时它是恒等函数** → 只用 host 座位测它，任何变异都过。
 *    与 mirror 漏翻 activeSide/winner 同族的**不动点陷阱**。测试必须用 seat = ENEMY。
 *
 * @param {'player'|'enemy'|null} absSide 绝对座位（reducer 坐标）；null = 中立叙述
 * @param {'player'|'enemy'} seat 收件人的绝对座位
 */
export function toViewSide(absSide, seat) {
  if (!isSide(seat)) throw new Error(`toViewSide: seat 必须是合法的一侧，收到 ${JSON.stringify(seat)}`)
  if (absSide == null) return null
  if (!isSide(absSide)) throw new Error(`toViewSide: absSide 必须是合法的一侧或 null，收到 ${JSON.stringify(absSide)}`)
  return absSide === seat ? PLAYER : ENEMY
}

/**
 * 把一条环上事件投影到收件人的座位。按 EVENT_FIELDS[kind] **重建**。
 *
 * ☠️ **slot 逐字不动。** 见 encodeIntent/decodeIntent 上方那段关于「slot 跨镜像恒等」的
 *    论证 —— mirror 是 side **标签**的置换，不是 slot **下标**的置换。
 *    危险在于正确答案是「什么都不做」：三个月后一个好心人看到「快照翻了、slot 没翻」，
 *    会顺手在这里加一行 `slot: MAX_FIELD_SLOTS - 1 - evt.slot`。它不报错、不变红。
 *    test-wire-events 的 ④b 就是为那一行准备的。
 */
export function toViewEvent(evt, seat) {
  const fields = EVENT_FIELDS[evt?.kind]
  if (!fields) throw new Error(`toViewEvent: 未知的 kind ${JSON.stringify(evt?.kind)}`)
  const out = { seq: evt.seq, kind: evt.kind }
  for (const f of fields) {
    out[f] = f === 'side' ? toViewSide(evt.side, seat) : evt[f]
  }
  return out
}

// ================================================================
//  事件构造器 —— 通道③ 的入口棘轮
// ================================================================

// 构造器**不接受 seq 参数** → seq 不可伪造，只有 appendEvents 能铸造。
// 严格 arity：多传一个参数就抛错 —— 这是「`_side` 混不进环」的入口保证。
const arity = (name, got, want) => {
  if (got !== want) throw new Error(`${name}: 期望 ${want} 个参数，收到 ${got} —— 构造器不透传多余字段（环上不得有 _ 开头的键）`)
}
const ckSide = (name, side, allowNull) => {
  if (side == null && allowNull) return
  if (!isSide(side)) throw new Error(`${name}: side 必须是绝对座位${allowNull ? '或 null' : ''}，收到 ${JSON.stringify(side)}`)
}
const ckSlot = (name, slot) => {
  if (slot !== LEADER_SLOT && !(Number.isInteger(slot) && slot >= 0 && slot < MAX_FIELD_SLOTS)) {
    throw new Error(`${name}: slot 必须是 ${LEADER_SLOT}(主人) 或 0..${MAX_FIELD_SLOTS - 1}，收到 ${JSON.stringify(slot)}`)
  }
}
const ckText = (name, text) => {
  if (typeof text !== 'string') throw new Error(`${name}: text 必须是字符串，收到 ${JSON.stringify(text)}`)
}
const ckTone = (name, tone) => {
  if (!TONES.includes(tone)) {
    throw new Error(`${name}: tone 必须 ∈ TONES(${TONES.join('|')})，收到 ${JSON.stringify(tone)} —— ` +
      `tone 是**语义 token，不是 tailwind class**（协议不带表现层；且 Tailwind v4 扫全项目含注释）`)
  }
}

export function floatEvent(side, slot, text, tone) {
  arity('floatEvent', arguments.length, 4)
  ckSide('floatEvent', side, false); ckSlot('floatEvent', slot); ckText('floatEvent', text); ckTone('floatEvent', tone)
  return { kind: 'float', side, slot, text, tone }
}

export function fxEvent(side, slot, name) {
  arity('fxEvent', arguments.length, 3)
  ckSide('fxEvent', side, false); ckSlot('fxEvent', slot); ckText('fxEvent', name)
  return { kind: 'fx', side, slot, name }
}

/** side 可为 null = 中立叙述（环境事件）→ 接收方不加视角前缀。 */
export function logEvent(side, text) {
  arity('logEvent', arguments.length, 2)
  ckSide('logEvent', side, true); ckText('logEvent', text)
  return { kind: 'log', side, text }
}

/**
 * 手牌揭示（显微镜等）。**留在公共环**，不是泄漏 —— 载荷早就是脱敏的
 * （skillRegistry 的 revealObj = {name, nameEn, cost, faction, rarity}，无 id/atk/hp/skills），
 * 且两人局里环的收件人只有两个：**发起方**（凭技能赢得了这个信息）和**手牌主人**
 * （那是他自己的牌）—— 没有第三方，广播泄漏量为零。
 *
 * ⚠️ 但 text 里**不许拼牌名** —— 理由不是隐私，是「结构化数据不该拼进日志文本」。
 *    牌名只在 cards 里，渲染层自己拼。
 */
export function revealEvent(side, text, cards) {
  arity('revealEvent', arguments.length, 3)
  ckSide('revealEvent', side, false); ckText('revealEvent', text)
  if (!Array.isArray(cards)) throw new Error(`revealEvent: cards 必须是数组，收到 ${JSON.stringify(cards)}`)
  return { kind: 'reveal', side, text, cards }
}

/** PvP 里不发，留位（PvE 的 bossMechanicEvents 已经是「消费即清空」的环语义）。 */
export function bossEvent(side, slot, text, tone, dialogueKey) {
  arity('bossEvent', arguments.length, 5)
  ckSide('bossEvent', side, false); ckSlot('bossEvent', slot); ckText('bossEvent', text); ckTone('bossEvent', tone)
  return { kind: 'boss', side, slot, text, tone, dialogueKey: dialogueKey ?? null }
}

// ================================================================
//  事件环 —— 纯函数，环本身由调用方持有（本模块零状态）
// ================================================================

/**
 * 纯。两件事，各有一个容易写错的地方：
 *
 * ① **seq 从环的末元素派生，不从 length 派生。**
 *    ☠️ 截断之后 length 与 seq **脱钩**：用 length 发号会让 seq 倒退重复，guest 的 lastSeen
 *       从此永久卡住、再也收不到任何浮字。这是本模块最阴的一个坑 —— 前两条断言（长度对、
 *       末元素对）**照样绿**，只有「首元素 seq」那条能抓住它。
 * ② **封顶由生产者在 append 时强制**（slice 末尾）→ 调用方无法忘记。截断**不重置 seq**。
 *
 * 空环从 1 开始发号 → `lastSeen: 0` 天然是「全都给我」。
 */
export function appendEvents(ring, events) {
  if (!Array.isArray(ring)) throw new Error('appendEvents: ring 必须是数组')
  if (!Array.isArray(events)) throw new Error('appendEvents: events 必须是数组')
  if (events.length === 0) return ring
  let seq = ring.length > 0 ? ring[ring.length - 1].seq : 0
  const stamped = events.map((e) => {
    if (!EVENT_KINDS.includes(e?.kind)) throw new Error(`appendEvents: 未知的 kind ${JSON.stringify(e?.kind)} —— 请用构造器造事件`)
    seq += 1
    return { ...e, seq }
  })
  return [...ring, ...stamped].slice(-EVENT_RING_CAP)
}

/** 环里 seq 严格大于 since 的部分。`since: 0` = 全给。 */
export function sliceEvents(ring, since) {
  return ring.filter((e) => e.seq > since)
}

/** host 仍保留的最老事件 seq。0 = 环为空。guest 用它自检缺口，无需 host 算 gap。 */
export function ringBaseOf(ring) {
  return ring.length > 0 ? ring[0].seq : 0
}

/**
 * ★ guest 侧的纯函数。**缺口 / 重连 / 重推 / 换局**的全部语义都在这里，一处。
 *
 * 「**环是装饰，快照是真相**」：resync 时跳过全部动画、直接吃快照。少放几个浮字不影响
 * 正确性；把整局的浮字一次性糊在脸上（而且是显示在「16ms 后就不存在的卡」的坐标上）才影响。
 *
 * ☠️ `g !== lastG` 这条分支是 handleRestart 的答案：它**不卸载 useBattle**，直接调
 *    startBattle → 新局事件 seq 从 1 重发，而 guest 的 lastSeen 还在 200。没有 g 的话，
 *    缺口判据 `events[0].seq > lastSeen + 1` 即 `1 > 201` = **false** → 不 resync、render 空
 *    → **新一局整局零浮字零日志，无报错**。齐齐会看着一块会动但一言不发的棋盘。
 *
 * @returns {{render: Array, lastSeen: number, resync: boolean, g: string}}
 */
export function readEvents(lastSeen, lastG, frame) {
  const { events = [], ringBase = 0, g } = frame || {}
  const lastOf = (evts) => (evts.length > 0 ? evts[evts.length - 1].seq : lastSeen)

  // 换局：seq 会倒退，一切算术失效。直接跳到新局的水位、吃快照。
  if (g !== lastG) return { render: [], lastSeen: lastOf(events), resync: true, g }
  if (events.length === 0) return { render: [], lastSeen, resync: false, g }

  // 缺口：host 已经把我没看过的事件挤出环了（断线重连 / 单回合事件量超过 CAP）。
  const base = events[0].seq ?? ringBase
  if (base > lastSeen + 1) return { render: [], lastSeen: lastOf(events), resync: true, g }

  return { render: events.filter((e) => e.seq > lastSeen), lastSeen: lastOf(events), resync: false, g }
}

// ================================================================
//  公开性守门人 —— 通道① 从「透明管道」升级成「守门人」
// ================================================================

const isPlainObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

/**
 * 递归找出树里的私有字段，返回犯规路径。**子串 + 大小写不敏感**匹配 PRIVATE_KEYS。
 *
 * 这条守卫会在有人「顺手把手牌收进 reducer 好方便」时变红 —— 那个人多半是三个月后的
 * 我们自己，且当时会觉得很有道理。往 reducer 里加字段前先问一句：
 * **我愿意让对面小孩看见它吗？**
 */
export function findPrivate(state) {
  const hits = []
  const walk = (v, path) => {
    if (!v || typeof v !== 'object') return
    for (const k of Object.keys(v)) {
      const here = path ? `${path}.${k}` : k
      const lower = k.toLowerCase()
      const allowed = PUBLIC_ALLOW.some((p) => p.toLowerCase() === lower)
      if (!allowed && PRIVATE_KEYS.some((p) => lower.includes(p.toLowerCase()))) hits.push(here)
      walk(v[k], here)
    }
  }
  walk(state, '')
  return hits
}

/**
 * ★ 找出「顶层带侧别语义、但 mirror 不会翻」的标量。**不点名字段** —— 于是第 2 步一旦有人
 * 加一个，自动红，无需有人记得。
 *
 * 两类犯规都报：
 *   ① 顶层出现了 SIDE_VALUED_PATHS 之外的侧别标量（→ mirror 靠 `...s` 原样透传它 = 语义翻转）
 *   ② 声明在 SIDE_VALUED_PATHS 里、但 mirror 实际没翻（→ 漏翻。而 mirror(mirror(s))===s
 *      对这个是**结构性瞎的**：它们是 swap 的不动点）
 *
 * 自带 mirror（不收 view 参数）：收 view 的话，调用方传 viewFor(PLAYER, s)（恒等）就会让
 * ② 恒绿 —— 又一个不动点陷阱。不给调用方这个机会。
 */
export function findSideValuedLeak(state) {
  const view = mirror(state)
  const hits = []
  const walk = (v, viewV, path) => {
    if (!isPlainObj(v)) return
    for (const k of Object.keys(v)) {
      if (path === '' && (k === PLAYER || k === ENEMY)) continue   // 两棵子树：mirror 整棵搬，天然对
      const here = path ? `${path}.${k}` : k
      const val = v[k]
      if (isSide(val)) {
        if (!SIDE_VALUED_PATHS.includes(here)) {
          hits.push(`${here}（未申报的顶层侧别标量：mirror 靠 ...s 原样透传它 → 收件人会把对手的一侧读成自己的。` +
            `正确形状是把它放进每侧子树，例如 state[side].xxx: boolean）`)
        } else if (viewV?.[k] !== opp(val)) {
          hits.push(`${here}（申报了但 mirror 没翻 —— 而 mirror(mirror(s))===s 对它是结构性瞎的，它是 swap 的不动点）`)
        }
      }
      walk(val, viewV?.[k], here)
    }
  }
  walk(state, view, '')
  return hits
}

/**
 * 把状态树塌成一条排好序的路径清单。形状棘轮的判据。
 * 两棵子树塌成 `<side>.` 前缀（它们结构全等 —— 那正是 mirror 成立的前提）；数组塌成叶子。
 */
export function collectPaths(state) {
  const out = new Set()
  const walk = (v, path) => {
    if (!isPlainObj(v)) { out.add(path); return }
    const keys = Object.keys(v)
    if (keys.length === 0) { out.add(path); return }
    for (const k of keys) walk(v[k], path ? `${path}.${k}` : k)
  }
  for (const k of Object.keys(state)) {
    if (k === PLAYER || k === ENEMY) walk(state[k], '<side>')
    else walk(state[k], k)
  }
  return [...out].sort()
}

/**
 * ☠️ 跑在 host **每一次推送**上 → 第 2 步的人第一次真机就炸，不用等测试跑。
 * 这是「reducer 里的东西 = 公开的」这条不变式从**注释**升级成**执行者**的那一步。
 */
export function assertPublicShape(state) {
  const priv = findPrivate(state)
  if (priv.length > 0) {
    throw new Error(
      `assertPublicShape: reducer 里出现了私有字段 ${priv.join(', ')} —— 公开通道 = send(mirror(state)) **整棵推**，\n` +
      `      所以**进 reducer 就等于声明公开**。私有数据走通道②（只发给本人）。\n` +
      `      先问：我愿意让对面小孩看见它吗？`)
  }
  const want = SHAPES[PROTOCOL_VERSION]
  const got = collectPaths(state)
  if (got.length !== want.length || got.some((p, i) => p !== want[i])) {
    throw new Error(
      `assertPublicShape: 棋盘形状与 SHAPES[${PROTOCOL_VERSION}] 不符。\n` +
      `      期望: ${want.join(', ')}\n` +
      `      实际: ${got.join(', ')}\n` +
      `      改了状态树的形状 = 改了协议 → **必须 bump PROTOCOL_VERSION 并加 SHAPES 条目**。`)
  }
}

// ================================================================
//  sync（host → guest）—— 三通道 = 一条消息的三个字段
// ================================================================

/**
 * ★ **唯一的 sync 构造器。**
 *
 * 三通道是**一条消息的三个字段**，不是三条消息 —— 它们时序上本就一起推（「随快照推」），
 * 拆成三条只会引入「三条之间乱序」这个本来不存在的失效模式。
 *
 * ☠️ 通道② 的私有载荷**不是参数，是 `sources[to]` 这一个索引表达式的产物** →
 *    「把 player 的手牌发给 enemy」在调用点**写不出来**。这是通道② 全部安全性之所在。
 * ☠️ 通道① 的载荷也不是调用方传的，是 buildSync 自己 viewFor 算的 →
 *    「公开通道 = mirror(reducerState)」不是文档约定，**是构造器的类型**。
 *
 * @param {object}   a
 * @param {object}   a.state   reducer 的**绝对**状态（未投影）
 * @param {object}   a.sources { player: {hand, drawPileCount, spChoice}, enemy: {…} } —— 按 seat 索引
 * @param {Array}    a.ring    完整事件环（已 appendEvents 盖过 seq）
 * @param {'player'|'enemy'} a.to 收件人的绝对座位
 * @param {number}   a.since   ☠️ **host 自己的已发水位（adapter 的 cursor[seat]），不是 guest 报来的
 *                             lastSeen** —— guest 在 host 的整个回合里不发任何 intent，而那正是事件被
 *                             生产出来的时段。若 since 来自 intent 搭车的 lastSeen，它会在整个 host 回合
 *                             内冻结 → 每帧重发整个窗口，且一旦单回合事件量超过 CAP 就会算出**假缺口**。
 *                             只有 resume 时才用 guest 报的 lastSeen 重置 cursor。
 * @param {number}   a.ack     ☠️ host 该座位游标的当前位置 = 最后一个被 acceptIntent **消费**的 n。
 *                             **不是「引擎已应用」** —— attack() 有多条 `addLog(...); return null` 的
 *                             日常拒绝路径（召唤疲劳 / 本回合已攻击过 / 必须先打守护卡）。若 ack 只在
 *                             规则接受时推进：齐齐点一张刚出场的卡 → ack 停住 → guest 永远重传同一个 n
 *                             → host 恒答 dup → **界面永久卡死，日志里只有一行「召唤疲劳」**。
 *                             被规则拒绝的 intent 不需要重传，它需要**结果反馈** —— 而结果已经在
 *                             通道③ 的 log + 通道① 的快照（棋盘没变）里。
 * @param {string}   a.g       matchId
 */
export function buildSync({ state, sources, ring, to, since, ack, g }) {
  if (!isSide(to)) throw new Error(`buildSync: to 必须是合法的一侧，收到 ${JSON.stringify(to)}`)
  assertPublicShape(state)

  const src = sources?.[to]
  if (!src) throw new Error(`buildSync: sources 里没有座位 ${to} 的私有载荷`)
  if (src.spChoice && src.spChoice.side !== to) {
    throw new Error(
      `buildSync: sources.${to}.spChoice.side 是 ${JSON.stringify(src.spChoice.side)} —— **SP 候选装错桶了**。\n` +
      `      pendingSpSummon 今天是**全局单例**（一个 useState），最自然的接法是往两个桶里各挂一份 ——\n` +
      `      那个写法「看起来完全正确」（对象自带 side，UI 就是靠读 .side 过滤的），\n` +
      `      而它会把 host 的 SP 候选在**点选前**寄给对面小孩。`)
  }

  // 按 SELF_SPEC **重建**，不透传 —— 通道② 是唯一真正装秘密的通道，它不能是唯一没有 schema 的。
  const self = { owner: to, hand: src.hand ?? [], drawPileCount: src.drawPileCount ?? 0, spChoice: src.spChoice ?? null }

  return {
    v: PROTOCOL_VERSION,
    t: MSG.SYNC,
    g,
    to,
    ack,
    ringBase: ringBaseOf(ring),
    state: viewFor(to, state),
    self,
    events: sliceEvents(ring, since).map((e) => toViewEvent(e, to)),
  }
}

const SYNC_FIELDS = ['g', 'to', 'ack', 'ringBase', 'state', 'self', 'events']

/**
 * ★ guest 侧的**版本闸门**。与 decodeIntent 同构的投影器：按白名单取，多余字段进不来。
 *
 * ☠️ 版本闸门装在 guest→host 一个方向是不够的 —— 线上后果发生在 **host→guest**：
 *    `npm run deploy` 跑完，齐齐的 iPad 标签页还挂着旧 bundle，无闸门就会吃下新形状的快照
 *    → 空手牌 / NaN HP / 白屏，而 host 侧一切正常（他刷新过）。
 */
export function decodeSync(raw) {
  if (!isPlainObj(raw)) return { ok: false, reason: 'shape' }
  if (raw.v !== PROTOCOL_VERSION) return { ok: false, reason: 'version' }
  if (raw.t !== MSG.SYNC) return { ok: false, reason: 'type' }
  if (!isSide(raw.to) || !isPlainObj(raw.state) || !isPlainObj(raw.self) || !Array.isArray(raw.events)) {
    return { ok: false, reason: 'shape' }
  }
  const out = { ok: true }
  for (const f of SYNC_FIELDS) out[f] = raw[f]
  return out
}

// ================================================================
//  intent（guest → host）
// ================================================================

/**
 * ## ☠️ slot 跨镜像**恒等**，一个字节都不翻。host 用连接的座位替换 side，别的什么都不做。
 *
 * 证明（逐条实测）：
 *   · mirror 是 side **标签**的置换，不是 slot **下标**的置换 —— 它整棵 structuredClone 搬
 *     subtree，**从不 reverse 数组**（sides.js:76-77）；两侧 field 的渲染也无 .reverse()
 *   · 引擎的每个 slot 参数**已经是相对行动方**的：canAttackFrom 读 state[side].field、
 *     canTargetSlot 读 state[opp(side)].field、playToField 读 state[side].field。而行动方 = 座位
 *
 * 逐步验算：guest（seat = ENEMY）的 view = mirror(S)，他从 `view.player.field[i]` 选中 →
 * 那正是 `S.enemy.field[i]`；host 执行 attack(i, j, {}, 'enemy') 读 `S.enemy.field[i]` ✓，
 * `foe = opp('enemy') = 'player'` 读 `S.player.field[j] === view.enemy.field[j]` ✓。
 *
 * **恒等成立的前提有两条，任一被破坏就静默错位**：① mirror 不重排数组（test-side-symmetry
 * 守着）；② attack 用 opp(side) 派生 foe，不硬编码（同上）。
 *
 * ⚠️ **危险在于正确答案是「什么都不做」** —— 三个月后一个好心人看到「快照翻了、intent 没翻」，
 *    会顺手给 intent 加个 mirror，guest 的 slot 4 就变成 host 的 slot 1，不报错、不变红。
 *    test-wire-intent 的 ④ 把「恒等」本身钉住了。
 */
export function encodeIntent(kind, payload, n, g) {
  const fields = INTENT_FIELDS[kind]
  if (!fields) throw new Error(`encodeIntent: 未知的 kind ${JSON.stringify(kind)}（合法值：${INTENT_KINDS.join('|')}）`)
  if (!Number.isSafeInteger(n) || n < 1) throw new Error(`encodeIntent: n 必须是 ≥1 的整数，收到 ${JSON.stringify(n)}`)
  const out = { v: PROTOCOL_VERSION, t: MSG.INTENT, g, n, kind }
  for (const f of fields) out[f] = payload?.[f]
  return out
}

const ckUid = (v) => typeof v === 'string' && v.length > 0
const ckFieldSlot = (v) => Number.isInteger(v) && v >= 0 && v < MAX_FIELD_SLOTS

// 每个 kind 的载荷判据。**只查形状，不查规则** —— {atkSlot: 999} 形状非法（越界），
// 但 {atkSlot: 0} 指着一个空槽是**规则**问题，交给 rules.js 拒。
const PAYLOAD_OK = {
  play: (p) => ckUid(p.uid) && ckFieldSlot(p.slot),
  playEvent: (p) => ckUid(p.uid),
  attack: (p) => ckFieldSlot(p.atkSlot) && (ckFieldSlot(p.defSlot) || p.defSlot === LEADER_SLOT),
  answer: (p) => ckUid(p.qid) && Number.isInteger(p.choice) && p.choice >= 0,
  mulligan: (p) => Array.isArray(p.uids) && p.uids.every(ckUid),
  endMain: () => true,
  endTurn: () => true,
  breakBank: () => true,
  spChoose: (p) => p.uid === null || ckUid(p.uid),
}

/**
 * ☠️ **投影器，不是校验器。**
 *
 * 按 INTENT_FIELDS[kind] 逐字段拷贝，然后无条件写 `side: seat`。
 * **`raw.side` 在本函数体里根本不出现**（test-wire-intent 的 ① 用 source-grep 断言这一点）。
 *
 * 「host 忽略 raw.side」是**运行时纪律**，活在一行 if 里，那行 if 会被下一个 `?? raw.side`
 * 悄悄拆掉。**投影器不需要谁记得忽略**：注入的 side / awakenOpts / damageMultiplier
 * 在 host 看到它之前就不存在了。
 *
 * ⚠️ **不校验 uid 前缀**：那是 mintHandUid 铸造约定的第二个真相源。真正的 gate 是 host 在
 *    **hands[seat]（发送方自己的手牌）**里 find(uid) —— 别人的 uid 天然找不到 → no-op。
 *
 * @param {object} raw 网络上收到的原始对象（不可信）
 * @param {'player'|'enemy'} seat **连接**给的座位，guest 从不自选
 */
export function decodeIntent(raw, seat) {
  if (!isSide(seat)) throw new Error(`decodeIntent: seat 必须是合法的一侧，收到 ${JSON.stringify(seat)}`)
  if (!isPlainObj(raw)) return { ok: false, reason: 'shape' }
  if (raw.v !== PROTOCOL_VERSION) return { ok: false, reason: 'version' }
  if (raw.t !== MSG.INTENT) return { ok: false, reason: 'type' }
  if (!INTENT_KINDS.includes(raw.kind)) return { ok: false, reason: 'kind' }
  if (!Number.isSafeInteger(raw.n) || raw.n < 1) return { ok: false, reason: 'payload' }

  const projected = {}
  for (const f of INTENT_FIELDS[raw.kind]) projected[f] = raw[f]
  if (!PAYLOAD_OK[raw.kind](projected)) return { ok: false, reason: 'payload' }

  return { ok: true, n: raw.n, g: raw.g, intent: { kind: raw.kind, side: seat, ...projected } }
}

// ================================================================
//  resume（guest → host）+ 去重
// ================================================================

/**
 * （重）连时的续播点。握手本身在第 3 步（中继）定，wire 不管连接建立 ——
 * **座位由连接给，guest 从不自选。**
 */
export function encodeResume(lastSeen, lastN, g) {
  return { v: PROTOCOL_VERSION, t: MSG.RESUME, g, lastSeen, lastN }
}

export function decodeResume(raw) {
  if (!isPlainObj(raw)) return { ok: false, reason: 'shape' }
  if (raw.v !== PROTOCOL_VERSION) return { ok: false, reason: 'version' }
  if (raw.t !== MSG.RESUME) return { ok: false, reason: 'type' }
  if (!Number.isSafeInteger(raw.lastSeen) || raw.lastSeen < 0) return { ok: false, reason: 'payload' }
  if (!Number.isSafeInteger(raw.lastN) || raw.lastN < 0) return { ok: false, reason: 'payload' }
  return { ok: true, lastSeen: raw.lastSeen, lastN: raw.lastN, g: raw.g }
}

/**
 * 去重规则的**唯一真相源**：`n > lastN`。
 *
 * ☠️ **严格去重意味着重传逻辑必须真的写**（第 3/4 步），不写就会卡住 —— 而**卡住是可见的**，
 *    宽松去重的静默吞掉是不可见的。这个取舍是刻意的。
 *
 * 为什么严格去重非有不可 —— 一条 `play` 被重放的后果（实测）：canPlayCard **不查这张 uid
 * 还在不在手上** → **二次扣能量 + 场上多一张同 uid 的卡**。（MARK_SUMMONED 靠 includes 幂等，
 * field 写入不是；唯一的天然 gate 在 useHand.playCard，而它在引擎**之后**调。）
 * 同理 playEvent（二次扣能量 + 二次触发）、mulligan（二次洗牌打乱抽牌堆）、spChoose（同 uid
 * 摆两处）。**引擎里只有 attack（MARK_ATTACKED + includes）和 breakPowerBank（intact 标志）
 * 有天然 gate。**
 *
 * `'reset'` 不是 `'dup'` 的花名：n 回到 1 是**计数器归零的强信号**（guest 刷新了页面）。
 * adapter 收到它该弹「请重新连接」，而不是让齐齐对着死按钮点二十次。
 */
export function acceptIntent(lastN, n) {
  if (n > lastN) return { ok: true }
  if (n === 1) return { ok: false, reason: 'reset' }
  return { ok: false, reason: 'dup' }
}

/**
 * 新连接的 n 起点。**协议规定**：guest 收到第一条 sync 后必须 `n = seedN(sync.ack)`。
 *
 * ☠️ 它挡死的是：guest 刷新页面 → 自己的 n 归零 → host 的 lastN 还是 20 →
 *    acceptIntent(20, 1..20) 全 false → **齐齐点什么都没反应，永久性的**。
 *    （另一半由 resume.lastN 兜：guest 是自己 n 的真相源，host 只是缓存。）
 */
export function seedN(ack) {
  return ack + 1
}
