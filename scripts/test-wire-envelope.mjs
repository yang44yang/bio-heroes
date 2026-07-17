// test-wire-envelope.mjs —— sync 消息（host → guest）的形状守卫。
//
// 分工（三个 test-wire-* 各守一样东西，别在这里重复）：
//   · test-wire-privacy   —— 「reducer 里的东西 = 公开的」这条**架构不变式**（已存在）
//   · test-wire-envelope  —— **本文件**：sync 的信封、三通道的分工、公开性守门、形状棘轮
//   · test-wire-intent    —— intent 的投影器性质 + slot 跨镜像恒等
//   · test-wire-events    —— 事件环的 seq / 封顶 / 缺口 / 换局
//
// ⚠️ 本项目已被假绿烧过**六次**。本文件的纪律：
//   · fixture 一律从**真的** initialBattleState + **真的** cards.js 改，绝不手搓「长得像」的对象
//   · 状态推进只走**真的** battleReducer
//   · 每条关键断言都配一个**变异**（改什么生产代码，它才该变红）—— 写在断言旁边的注释里
//   · 常量一律 import，不写字面量（写死 = 多一个真相源）

import { initialBattleState, battleReducer } from '../src/engine/battleReducer.js'
import { mirror, PLAYER, ENEMY } from '../src/engine/sides.js'
import { getRandomQuiz } from '../src/data/quizzes.js'
import CARDS from '../src/data/cards.js'
import {
  PROTOCOL_VERSION, SELF_SPEC, SHAPES,
  buildSync, decodeSync, viewFor, collectPaths,
  findPrivate, findSideValuedLeak,
} from '../src/engine/wire.js'

let pass = 0
const fails = []
const assert = (cond, msg) => { if (cond) pass++; else fails.push(msg) }
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const throws = (fn) => { try { fn(); return false } catch { return true } }

// ---- fixture（真卡 + 真 reducer）----
const byId = (id) => {
  const c = CARDS.find((x) => x.id === id)
  if (!c) throw new Error(`fixture 卡不存在: ${id} —— cards.js 改了？`)
  return c
}
const onField = (card, uid) => ({ ...card, uid, currentHp: card.hp, maxHp: card.hp, statuses: [] })

const WHALE = byId('blue_whale_titan')
const FLU = byId('flu_virus')

let S = structuredClone(initialBattleState)
// ⚠️ reducer 没有 per-slot 的 field action（只有 FIELD_UPDATE {side, value}）→ 直接赋值，
//    与 test-side-symmetry 的房规一致。field 是纯数组。
// ★ slot 选 0 和 4 是**有意的**：MAX_FIELD_SLOTS-1-1 = 4 且 MAX_FIELD_SLOTS-1-4 = 1 ——
//   **1 和 4 恰好互换**，用它们会让「镜像 slot」这个变异静默通过。0/4 不是互换对。
S.player.field[0] = onField(WHALE, 'player_whale_0')
S.enemy.field[4] = onField(FLU, 'enemy_flu_4')
S = battleReducer(S, { type: 'LEADER_DAMAGE', side: ENEMY, amount: 5000 })
S = battleReducer(S, { type: 'MARK_ATTACKED', side: PLAYER, uid: 'player_whale_0' })

// ☠️ 两侧私有载荷**必须不同**，否则 ② 组的私有断言恒真（那本身就是一次假绿）
const sources = {
  [PLAYER]: { hand: [{ uid: 'player_ant_0', id: 'ant_soldier' }], drawPileCount: 14, spChoice: null },
  [ENEMY]: { hand: [{ uid: 'enemy_flu_1', id: 'flu_virus' }], drawPileCount: 15, spChoice: null },
}
const G = 'm_test'
const mk = (to, over = {}) => buildSync({ state: S, sources, ring: [], to, since: 0, ack: 0, g: G, ...over })

// ================================================================
//  ⓪ 信封的形状棘轮
// ================================================================
{
  const sync = mk(ENEMY)
  // 改这个列表 = 改协议 = **必须 bump PROTOCOL_VERSION**。
  // 变异：给 sync 加任意字段（哪怕 debug:true）→ 红。加字段的人被迫编辑测试、被迫想一下版本。
  assert(deepEq(Object.keys(sync).sort(), ['ack', 'events', 'g', 'ringBase', 'self', 'state', 't', 'to', 'v']),
    `⓪ sync 的字段集变了：${Object.keys(sync).sort().join(',')}\n` +
    '      改信封 = 改协议 → 必须 bump PROTOCOL_VERSION 并加 SHAPES 条目，再改这条断言。')
  assert(sync.v === PROTOCOL_VERSION && sync.t === 'sync' && sync.to === ENEMY, '⓪ v/t/to 正确')
}

// ================================================================
//  ① 通道① 公开快照 —— 收件人永远是 state.player
// ================================================================
{
  // 变异：viewFor 写成永远 mirror(state) → PLAYER 那条红；写成永远 state → ENEMY 那条红。
  // ☠️ **两条都要** —— 只测一条，另一个方向的变异就恒绿。
  assert(deepEq(mk(ENEMY).state, mirror(S)), '① guest 的快照 = mirror(S)')
  assert(deepEq(mk(PLAYER).state, S), '① host 的快照 = S 本身（恒等）')

  // ①b 同一条不变式的人话版：deepEq 挂了以后，它告诉你**为什么**要紧。
  assert(mk(ENEMY).state.player.field[4]?.id === 'flu_virus',
    '①b ★ 收件人永远是 state.player —— guest 的卡必须出现在他自己视角的 player 侧。\n' +
    '      漏了这条：BattleScreen 那 ~40 处 battle.player* 会把对手的场当成自己的场渲染。')
  assert(mk(ENEMY).state.enemy.field[0]?.id === 'blue_whale_titan', '①b 对手的卡在 enemy 侧')

  // ①c ★ 别名测试。变异：viewFor 省掉 structuredClone（`to===PLAYER ? state : mirror(state)`）→ 红。
  const sync = mk(PLAYER)
  const before = sync.state.player.energy
  S.player.energy = 999
  assert(sync.state.player.energy === before,
    '①c ★ sync 不得与活 state 共享引用 —— 否则消息在发送队列里等待时会跟着 host 后续的 dispatch 变，\n' +
    '      guest 收到的是「未来的棋盘」。')
  S.player.energy = before   // 还原，别污染后面的组
}

// ================================================================
//  ② 通道② 私有分发 —— 全部安全性在 `sources[to]` 这一个索引表达式上
// ================================================================
{
  // 变异：把 sources[to] 改成 sources[opp(to)] → 红。
  assert(deepEq(mk(ENEMY).self.hand, sources[ENEMY].hand), '② guest 收到自己的手牌')
  assert(!JSON.stringify(mk(ENEMY).self).includes('player_ant_0'),
    '② ★ guest 的私有载荷里不得有 host 的手牌')

  // ②b 对称。变异：把 sources[to] 改成写死 sources.enemy → 红。
  // ☠️ 只测 ENEMY 一侧会漏掉这个变异。
  assert(deepEq(mk(PLAYER).self.hand, sources[PLAYER].hand), '②b host 收到自己的手牌')
  assert(!JSON.stringify(mk(PLAYER).self).includes('enemy_flu_1'), '②b host 的私有载荷里不得有 guest 的手牌')

  // ②c ★★ 整条消息 sentinel 扫描（不是逐字段比对）→ **将来任何新字段泄漏手牌都会被抓住，
  //        不会随时间蒸发**。变异：`self: sources`（传全集）→ 红。
  const poisoned = {
    [PLAYER]: { hand: [{ ...WHALE, uid: 'SECRET_HOST_ONLY' }], drawPileCount: 14, spChoice: null },
    [ENEMY]: { hand: [{ ...FLU, uid: 'SECRET_GUEST_ONLY' }], drawPileCount: 15, spChoice: null },
  }
  const toGuest = JSON.stringify(mk(ENEMY, { sources: poisoned }))
  const toHost = JSON.stringify(mk(PLAYER, { sources: poisoned }))
  assert(!toGuest.includes('SECRET_HOST_ONLY'), '②c ★★ 发给 guest 的**整条消息**不得含 host 的私有 sentinel')
  assert(toGuest.includes('SECRET_GUEST_ONLY'), '②c 正向：guest 确实收到了自己的（防「守卫过严，谁的牌都不发」）')
  assert(!toHost.includes('SECRET_GUEST_ONLY'), '②c ★★ 反向同理')
  assert(toHost.includes('SECRET_HOST_ONLY'), '②c 正向：host 确实收到了自己的')

  // ②d ★ SP 候选**装错桶**。变异：删掉 buildSync 里 `spChoice.side !== to → throw` → 红。
  const misfiled = {
    [PLAYER]: { hand: [], drawPileCount: 0, spChoice: null },
    [ENEMY]: { hand: [], drawPileCount: 0, spChoice: { side: PLAYER, rule: {}, candidates: [{ uid: 'sp_p_0', name: '细胞分裂·无限增殖' }] } },
  }
  assert(throws(() => mk(ENEMY, { sources: misfiled })),
    '②d ★ spChoice 装错桶必须抛错 —— pendingSpSummon 今天是**全局单例**，第 4 步最自然的接法是\n' +
    '      往两个桶里各挂一份。那个写法「看起来完全正确」（对象自带 side，UI 就是靠读 .side 过滤的），\n' +
    '      而它会把 host 的 SP 候选在**点选前**寄给对面小孩。')

  // ②e 通道② 的 schema。变异：有人「顺手」把 spDeck 加回私有载荷 → 红。
  assert(deepEq(Object.keys(mk(ENEMY).self).sort(), [...SELF_SPEC].sort()), '②e self 的字段集 = SELF_SPEC')
  assert(!('spDeck' in mk(ENEMY).self),
    '②e self 里不得有 spDeck —— 实测**两侧** SP 卡组都只被读 .length（BattleScreen:1102-1105 是唯一\n' +
    '      读取点）→ 内容零消费者。「UI 只显示数量」正是「它是隐藏信息」的证据。')
  assert(mk(ENEMY).self.owner === ENEMY, '②e owner 由 buildSync 写死 = to（收件方可据此兜底中继错投）')
}

// ================================================================
//  ③ 通道① 是**公开性的守门人**，不是透明管道
// ================================================================
{
  // ☠️ 变异内联在这里（不是写在注释里）→ 不会随时间蒸发。
  const leak = structuredClone(S)
  leak.player.pendingSp = { side: PLAYER, rule: {}, candidates: [{ uid: 'sp_p_0', name: '细胞分裂·无限增殖' }] }
  assert(throws(() => mk(ENEMY, { state: leak })),
    '③ ★★ 带 candidates 的树必须推不出去 —— SP 候选在**点选前**寄给对面 = 提前剧透。\n' +
    '      变异：把 findPrivate 的递归改成只查顶层 → 本条红。')

  const leak2 = structuredClone(S)
  leak2.quiz = getRandomQuiz({})   // ★ **真的** getRandomQuiz —— 它真的带 correct（quizzes.js:943）
  assert('correct' in leak2.quiz, '③ 前提自检：getRandomQuiz 确实带 correct（否则下一条恒绿）')
  assert(throws(() => mk(ENEMY, { state: leak2 })),
    '③ ★★ 带 quiz.correct 的树必须推不出去 —— 明送答案会让作弊从「打开 devtools」降级到「看一眼 network」')

  // 防「守卫过严，干净的树也推不出去」
  assert(!throws(() => mk(ENEMY)), '③ 正向：干净的树必须推得出去')

  // ③b ★ 守卫自检 —— 这不是在测生产代码，是在测**守卫本身**。
  // 变异：findPrivate 恒返回 [] → 红。
  assert(findPrivate({ player: { pendingSp: { candidates: [] } } }).length > 0, '③b findPrivate 抓得住嵌套的 candidates')
  assert(findPrivate({ a: { b: { playerHand: [] } } }).length > 0,
    '③b ★ findPrivate 必须**子串**匹配 —— 精确匹配会放行 `playerHand`/`enemySpDeck` 这类真实键名')
  assert(findPrivate(S).length === 0, '③b findPrivate 不误伤干净的树')
  assert(findPrivate({ player: { handCount: 3, drawPileCount: 9 } }).length === 0,
    '③b PUBLIC_ALLOW 例外生效（张数是公开事实）—— 若你确实需要一个叫 correct 的公开字段，请改名，别放宽词表')
}

// ================================================================
//  ④ ★ 形状棘轮 —— 版本编进形状本身，不 bump 就绿不了
// ================================================================
{
  // 变异 = **第 2 步本身**：往 initialBattleState.player 加 quizStreak:0 → 本条红 →
  // 唯一能变绿的改法是加 SHAPES[2] 条目 + 把 PROTOCOL_VERSION 改成 2。
  assert(deepEq(collectPaths(initialBattleState), SHAPES[PROTOCOL_VERSION]),
    `④ ★ 棋盘形状与 SHAPES[${PROTOCOL_VERSION}] 不符：\n` +
    `      实际 ${JSON.stringify(collectPaths(initialBattleState))}\n` +
    `      期望 ${JSON.stringify(SHAPES[PROTOCOL_VERSION])}\n` +
    '      改状态树的形状 = 改协议 → **必须 bump PROTOCOL_VERSION 并加 SHAPES 条目**。')
  assert(SHAPES[PROTOCOL_VERSION].length > 10, '④ 形状清单非空（防「清单被清空 → 恒绿」）')

  // ★ 两棵子树结构全等 —— 那正是 mirror 成立的前提。
  // 变异：删掉这条 → 只给 player 加字段照样绿。
  const sub = (side) => collectPaths({ x: initialBattleState[side] }).map((p) => p.replace(/^x\./, ''))
  assert(deepEq(sub(PLAYER), sub(ENEMY)),
    '④ ★ 两棵子树必须结构全等 —— mirror 整棵对调它们，结构不等 = 对调后字段凭空出现/消失')
}

// ================================================================
//  ⑤ ★ 侧别标量泄漏扫描 —— **不点名字段** → 第 2 步一旦有人加，自动红
// ================================================================
{
  assert(findSideValuedLeak(S).length === 0, '⑤ 干净的树没有未申报的侧别标量')

  // ☠️ 这个 leak 不是假想：`state.quiz.answeredBy` 曾是**被裁定的设计**，直到发现 mirror 根本
  //    不翻它（sides.js 只翻 activeSide/winner/两棵子树，其余靠 ...s 透传）。
  //    线上后果：齐齐抢答成功，他的 UI 和 host 的 UI 会**同时**显示「是我抢到的」。
  //    正确形状是 state[side].quizAnswered: boolean（落进每侧子树 → mirror 天然对）。
  const leak3 = structuredClone(S)
  leak3.quiz = { answeredBy: PLAYER }
  const hits = findSideValuedLeak(leak3)
  assert(hits.length > 0 && hits[0].includes('quiz.answeredBy'),
    '⑤ ★ 顶层侧别标量必须被抓住（不点名字段的通用扫描）—— 实际抓到：' + JSON.stringify(hits))

  // 变异：从 mirror 删掉 winner 那行 → 本条红。而 mirror(mirror(s))===s **照样绿**（不动点）。
  const won = { ...structuredClone(S), winner: PLAYER }
  assert(findSideValuedLeak(won).length === 0, '⑤ ★ 申报过的 winner 必须真的被 mirror 翻转')
  assert(mirror(won).winner === ENEMY, '⑤ 人话版：漏翻 winner 的线上后果是**输的那个孩子看到胜利画面**')
}

// ================================================================
//  ⑥ 版本闸门 —— **双向**
// ================================================================
{
  const sync = mk(ENEMY)
  // 变异：删掉 decodeSync 的 v 检查 → 第一条红；decodeSync 写成恒 {ok:false} → 第二条红。
  assert(decodeSync({ ...sync, v: PROTOCOL_VERSION + 1 }).reason === 'version',
    '⑥ 版本不符必须硬拒 —— 线上后果：`npm run deploy` 跑完，齐齐的 iPad 标签页还挂着旧 bundle，\n' +
    '      无闸门就会吃下新形状的快照 → 空手牌 / NaN HP / 白屏，而 host 侧一切正常（他刷新过）。')
  assert(decodeSync(sync).ok === true, '⑥ 正向：自家产物必须过闸（防「闸门严到把自己拒了」）')
  assert(decodeSync({ ...sync, t: 'intent' }).reason === 'type', '⑥ 类型不符拒')
  assert(decodeSync(null).reason === 'shape', '⑥ 垃圾输入不崩')
}

// ================================================================
//  ⑦ ★ JSON-clean —— 直接扫树，**不用 round-trip**
// ================================================================
{
  // ☠️ **别写** `JSON.stringify(round) === JSON.stringify(sync)` —— 那个比较**恒真**
  //    （round 就是 round-trip 的产物：两边都过了 stringify，Set 在两边都塌成 {}）。
  //    它对「树里混了 Set/函数」是**结构性瞎的**。test-wire-privacy:71-73 的血账原样适用。
  const findNonJson = (v, path, out = []) => {
    if (v === null || typeof v !== 'object') {
      if (typeof v === 'function') out.push(`${path} = function`)
      return out
    }
    const tag = Object.prototype.toString.call(v)
    if (tag === '[object Set]' || tag === '[object Map]' || tag === '[object Date]' || tag === '[object RegExp]') {
      out.push(`${path} = ${tag}`)
      return out
    }
    for (const k of Object.keys(v)) findNonJson(v[k], `${path}.${k}`, out)
    return out
  }

  assert(findNonJson(mk(ENEMY), 'sync').length === 0,
    '⑦ sync 混了非 JSON 类型 —— 上线时会**静默蒸发**（JSON.stringify(new Set(["a"])) === "{}"）')

  // 守卫自检。变异：删掉 [object Set] 分支 → 红。
  assert(findNonJson({ self: { hand: new Set() } }, 's').length > 0, '⑦ ★ 守卫自检：抓得住 Set')
  assert(findNonJson({ events: [{ f() {} }] }, 's').length > 0, '⑦ ★ 守卫自检：抓得住 function')
}

assert(pass > 30, `⑧ 断言真的跑了（实测 ${pass} 条）`)

if (fails.length) {
  console.error(`❌ test-wire-envelope: ${fails.length} 条失败`)
  for (const f of fails) console.error('   · ' + f)
  process.exit(1)
}
console.log(`✅ test-wire-envelope: ${pass} 条断言通过`)
