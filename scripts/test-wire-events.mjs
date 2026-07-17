// test-wire-events.mjs —— 通道③ 有序事件环的守卫。
//
// 环上的东西是**边，不是值**：浮字要显示在一张 16ms 后就不存在的卡上，用的是**死前的数字**。
// 所以它不能从快照推导，必须单独走一条带 seq 的环。而一旦有了 seq，就有了乱序 / 重传 /
// 断线 / 换局 —— 本文件守的就是这些语义。
//
// ⚠️ 本步只守**格式**。33 个 skillEvent 内部 type → 表现事件的投影（projectSkillEvent）
//    留给第 4 步，与它的消费者一起写、一起对着真 skillRegistry.execute 测 —— 今天写它，
//    fixture 只能手搓「长得像」的对象，而那正是本项目被烧过六次的那个错。

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { PLAYER, ENEMY } from '../src/engine/sides.js'
import { MAX_FIELD_SLOTS } from '../src/data/deckRules.js'
import {
  EVENT_RING_CAP, EVENT_KINDS, LEADER_SLOT,
  floatEvent, fxEvent, logEvent, revealEvent, bossEvent,
  appendEvents, sliceEvents, ringBaseOf, readEvents,
  toViewSide, toViewEvent,
} from '../src/engine/wire.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0
const fails = []
const assert = (cond, msg) => { if (cond) pass++; else fails.push(msg) }
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const throws = (fn) => { try { fn(); return false } catch { return true } }

// ================================================================
//  ① seq 的发号
// ================================================================
{
  // 变异：起始 seq 改成 0 → 红。（`lastSeen: 0` = 「全都给我」的语义要求首条是 1。）
  assert(appendEvents([], [floatEvent(PLAYER, 4, '-8000', 'damage')])[0].seq === 1, '① 空环从 seq 1 开始发号')

  let r = []
  r = appendEvents(r, [floatEvent(PLAYER, 4, '-8000', 'damage'), floatEvent(ENEMY, 0, '-2000', 'damage')])
  r = appendEvents(r, [logEvent(PLAYER, '蓝鲸巨灵 击败了 流感病毒')])
  r = appendEvents(r, [fxEvent(ENEMY, 0, 'hit')])
  assert(deepEq(r.map((e) => e.seq), [1, 2, 3, 4]), '① 连续 append 后 seq 严格递增、无重复、无跳号')
  assert(r.every((e) => Number.isSafeInteger(e.seq)), '① seq 全是安全整数')
  assert(appendEvents(r, []) === r, '① 空 events 不换引用（no-op bailout）')

  // ①b seq **不可伪造**：只有 appendEvents 能铸造。变异：给 floatEvent 加 seq 参数 → 红。
  assert(floatEvent(PLAYER, 4, '-1', 'damage').seq === undefined, '①b 构造器不产 seq')
  const src = readFileSync(join(root, 'src/engine/wire.js'), 'utf8')
  const body = src.match(/export function floatEvent[\s\S]*?\n}/)?.[0] ?? ''
  assert(body.length > 0 && !/\bseq\b/.test(body), '①b floatEvent 的函数体里不得出现 seq')
}

// ================================================================
//  ② ★ 封顶 —— 三条断言缺一不可
// ================================================================
{
  let r = []
  const N = EVENT_RING_CAP + 36
  for (let i = 0; i < N; i++) r = appendEvents(r, [logEvent(PLAYER, 'l' + i)])

  // ☠️ 三个变异，各自只被其中一条抓住：
  //   ① 删掉 .slice(-EVENT_RING_CAP)        → 第 1 条红
  //   ② 改成 .slice(0, EVENT_RING_CAP)（留最老的）→ 第 2、3 条红，**第 1 条恒绿**
  //   ③ seq 从 ring.length + 1 派生         → **第 3 条红，前两条恒绿**（最阴的一个）
  assert(r.length === EVENT_RING_CAP, `② 环封顶在 EVENT_RING_CAP（实际 ${r.length}）`)
  assert(r[r.length - 1].seq === N, '② ★ 截断保留的是**最新的**那批（末元素 seq = 发号总数）')
  assert(r[0].seq === N - EVENT_RING_CAP + 1,
    '② ★★ **截断不重置 seq** —— seq 必须从环的**末元素**派生，不从 length 派生。\n' +
    '      用 length 发号：截断后 length 与 seq 脱钩 → seq 倒退重复 → guest 的 lastSeen\n' +
    '      **从此永久卡住、再也收不到任何浮字**。而前两条断言照样绿。')
}

// ================================================================
//  ③ 切片
// ================================================================
{
  let r = []
  for (let i = 0; i < 20; i++) r = appendEvents(r, [logEvent(PLAYER, 'l' + i)])

  // 变异：`e.seq > since` 改成 `>=` → 第一条红（guest 永远重收最后一条 = 浮字重播）
  assert(sliceEvents(r, 10).length === 10, '③ sliceEvents 只给 seq **严格大于** since 的')
  assert(sliceEvents(r, 0).length === 20, '③ since=0 = 全给')
  assert(sliceEvents(r, 1e9).length === 0, '③ since 超前 = 不给')
  assert(ringBaseOf(r) === 1 && ringBaseOf([]) === 0, '③ ringBaseOf：空环 = 0')
}

// ================================================================
//  ④ ★ 坐标翻译 —— 只在 toViewSide 一处发生
// ================================================================
{
  // ☠️ **必须用 seat = ENEMY 测**：toViewSide(x, PLAYER) 是**恒等函数** → 只用 host 座位测它，
  //    任何变异都过（与 mirror 漏翻 activeSide/winner 同族的不动点陷阱）。
  // 变异：`return absSide`（忘了翻）→ 只有 seat=ENEMY 的两条红。
  //       写成 `absSide === seat ? ENEMY : PLAYER`（翻反了）→ 最后一条红。
  assert(toViewSide(ENEMY, ENEMY) === PLAYER,
    '④ ★ guest 的事件在 guest 视角里是「我方」。\n' +
    '      线上后果：**guest 看到自己的伤害浮字飘在对手的棋盘上**。\n' +
    '      今天这个翻译**手工散在 5 处**（BattleScreen 的浮字路由 / useAITurn 的浮字路由 /\n' +
    '      BattleScreen 的日志前缀 —— 互为镜像的拷贝）。那是 PvP 最大的隐藏 fork。')
  assert(toViewSide(PLAYER, ENEMY) === ENEMY, '④ ★ host 的事件在 guest 视角里是「敌方」')
  assert(toViewSide(null, ENEMY) === null, '④ null = 中立叙述（环境事件），不翻、不加前缀')
  assert(toViewSide(PLAYER, PLAYER) === PLAYER && toViewSide(ENEMY, PLAYER) === ENEMY, '④ host 座位下是恒等')

  // ④b ★ slot **不翻**。变异：给 toViewEvent 加 `slot: MAX_FIELD_SLOTS-1-evt.slot` → 第二条红。
  //     （**那正是有人一定会「贴心地」加上的那一行**。）
  const v = toViewEvent({ ...floatEvent(PLAYER, 4, '-1', 'damage'), seq: 7 }, ENEMY)
  assert(v.side === ENEMY, '④b side 翻了')
  assert(v.slot === 4,
    '④b ★ slot **逐字不动** —— mirror 是 side 标签的置换，不是 slot 下标的置换。\n' +
    `      （MAX_FIELD_SLOTS=${MAX_FIELD_SLOTS} 时「镜像」会把 4 变成 1）`)
  assert(v.seq === 7, '④b seq 原样带过（投影不丢它）')

  // ④c ★ 出口白名单。变异：toViewEvent 写成 `{...e, side: toViewSide(e.side, seat)}` → 红。
  // ☠️ **双守卫**：构造器是入口棘轮（结构上进不来），toViewEvent 是出口白名单（进来了也出不去）。
  //    只有前者 ⇒ 绕过构造器直接 ring.push 就废了；只有后者 ⇒ 下次加 kind 时没人记得。
  const poisoned = { kind: 'float', side: PLAYER, slot: 4, text: '-1', tone: 'damage', seq: 9, _side: 'attacker', targetUid: 'x' }
  const cleaned = toViewEvent(poisoned, ENEMY)
  assert(!('_side' in cleaned) && !('targetUid' in cleaned),
    '④c ★ 绕过构造器塞进环的字段，也必须出不去。\n' +
    '      `_side` 取值 enemy|friendly|attacker，**相对行动方** —— 它是 applySkillEvents 的私有\n' +
    '      路由词汇表，host 早已消费掉了。guest 拿到 "attacker" **无法解释**：环里没说 attacker 是谁。')
  assert(deepEq(Object.keys(cleaned).sort(), ['kind', 'seq', 'side', 'slot', 'text', 'tone']), '④c 投影后的字段集是白名单')
}

// ================================================================
//  ⑤ ★ readEvents —— 缺口 / 换局 / 增量 / 空环
// ================================================================
{
  const evts = (from, to) => {
    const out = []
    for (let s = from; s <= to; s++) out.push({ kind: 'log', side: null, text: 'x', seq: s })
    return out
  }

  // ⑤ ★ 换局。变异：删掉 `g !== lastG` 比对 → 红。
  const r1 = readEvents(200, 'g1', { events: evts(1, 3), ringBase: 1, g: 'g2' })
  assert(r1.resync === true && r1.render.length === 0 && r1.lastSeen === 3,
    '⑤ ★ 换局必须靠 g 挡住，不靠 seq 算术。\n' +
    '      线上后果：handleRestart **不卸载 useBattle**、直接调 startBattle → 新局 seq 从 1 发号、\n' +
    '      而 guest 的 lastSeen 还在 200 → 缺口判据 `1 > 201` 为**假** → 不 resync、render 空 →\n' +
    '      **齐齐看着一块会动但一言不发的棋盘，整局零日志零浮字，无报错**。')

  // ⑤b 缺口。变异：`if (base > lastSeen+1)` → `if (false)` → 红。
  const r2 = readEvents(0, 'g1', { events: evts(137, 200), ringBase: 137, g: 'g1' })
  assert(r2.resync === true && r2.render.length === 0 && r2.lastSeen === 200,
    '⑤b 缺口必须 resync（跳过动画、直接吃快照）—— 「环是装饰，快照是真相」。\n' +
    '      线上后果：guest 断线重连后整局的浮字一次性糊在脸上，且显示在「16ms 后就不存在的卡」的坐标上。')

  // ⑤c 增量 + 幂等。变异：`render: events`（不过滤）→ 第一条红；不推进 lastSeen → 第二条红；
  //     `base >= lastSeen+1` → 增量被误判成缺口 → 红。
  const r3 = readEvents(5, 'g1', { events: evts(1, 10), ringBase: 1, g: 'g1' })
  assert(deepEq(r3.render.map((e) => e.seq), [6, 7, 8, 9, 10]) && r3.resync === false, '⑤c 增量：只 render 没看过的')
  const r4 = readEvents(r3.lastSeen, 'g1', { events: evts(1, 10), ringBase: 1, g: 'g1' })
  assert(r4.render.length === 0, '⑤c ★ 幂等：同一帧读两次，第二次不重播（否则重推 = 浮字放两遍）')
  assert(readEvents(0, 'g1', { events: evts(1, 3), ringBase: 1, g: 'g1' }).resync === false,
    '⑤c 边界：base=1、lastSeen=0 是**增量不是缺口**（`1 > 1` 为假）')

  // ⑤d 空环。变异：空 events 走进缺口分支 → 红。
  const r5 = readEvents(7, 'g1', { events: [], ringBase: 0, g: 'g1' })
  assert(r5.render.length === 0 && r5.lastSeen === 7 && r5.resync === false, '⑤d 空环：lastSeen 不动、不误判成缺口')
}

// ================================================================
//  ⑥ 构造器在源头响
// ================================================================
{
  // 变异：删 TONES / side 检查 → 红。（同 sides.opp 的纪律：在源头响，别让 undefined 飘到很远。）
  assert(throws(() => floatEvent(PLAYER, 4, '-1', 'rainbow')), '⑥ tone ∉ TONES 抛错')
  assert(throws(() => floatEvent(PLAYER, 4, '-1', 'text-red-400')), '⑥ tone 不是 tailwind class')
  assert(throws(() => logEvent('attacker', 'x')), '⑥ side 必须是**绝对**座位（attacker 是相对的，环上不认）')
  assert(throws(() => floatEvent(PLAYER, MAX_FIELD_SLOTS, '-1', 'damage')), '⑥ slot 越界抛错')
  assert(!throws(() => floatEvent(PLAYER, LEADER_SLOT, '-1', 'damage')), '⑥ 正向：slot=-1（主人）合法')
  assert(!throws(() => logEvent(null, '🌡️ 全球变暖：自然系 ATK -20%')), '⑥ 正向：log 的 side 允许 null')
  assert(throws(() => appendEvents([], [{ kind: 'nuke' }])), '⑥ 未知 kind 进不了环')
}

// ================================================================
//  ⑦ ★ 环上不得有 `_` 开头的键（入口棘轮）
// ================================================================
{
  // 变异：构造器写成 `{...raw}` 透传 → 红。
  assert(throws(() => floatEvent(PLAYER, 4, '-1', 'damage', { _side: 'attacker' })),
    '⑦ ★ 构造器必须拒绝多余入参 —— 这是「_side 混不进环」的入口保证。\n' +
    '      那个词汇表本来就脆：它拼错过一次，applySkillEvents 不认，**技能静默哑火**。')
  const ring = appendEvents([], [floatEvent(PLAYER, 4, '-8000', 'damage'), logEvent(ENEMY, 'x')])
  assert(!JSON.stringify(ring).includes('_side'), '⑦ 环上零 _side')
}

// ================================================================
//  ⑧ 词表 + reveal 的 redact
// ================================================================
{
  assert(deepEq([...EVENT_KINDS].sort(), ['boss', 'float', 'fx', 'log', 'reveal']), '⑧ EVENT_KINDS 是闭合词表')
  assert(Object.isFrozen(EVENT_KINDS), '⑧ EVENT_KINDS 冻结')

  // 变异：给 reveal 的 text 拼进牌名 → 红。
  // ⚠️ 理由**不是隐私**（revealObj 早已脱敏，且两人局里环的收件人只有发起方和牌主人，无第三方）——
  //    是「结构化数据不该拼进日志文本」。牌名只在 cards 里，渲染层自己拼。
  const rv = revealEvent(PLAYER, '🔍 显微镜 揭示了对手的手牌',
    [{ name: '水熊虫·不灭', nameEn: 'Tardigrade', cost: 2, faction: 'nature', rarity: 'SSR' }])
  assert(!rv.text.includes('水熊虫'), '⑧ reveal 的 text 不得拼进牌名（结构化数据走 cards 字段）')
  assert(rv.cards[0].name === '水熊虫·不灭', '⑧ 正向：牌名在 cards 里')
  assert(!('id' in rv.cards[0]) && !('atk' in rv.cards[0]), '⑧ 前提自检：revealObj 已脱敏（无 id/atk/hp/skills）')

  assert(bossEvent(PLAYER, 0, 'x', 'boss', null).dialogueKey === null, '⑧ bossEvent 留位（PvP 里不发）')
}

assert(pass > 30, `⑨ 断言真的跑了（实测 ${pass} 条）`)

if (fails.length) {
  console.error(`❌ test-wire-events: ${fails.length} 条失败`)
  for (const f of fails) console.error('   · ' + f)
  process.exit(1)
}
console.log(`✅ test-wire-events: ${pass} 条断言通过`)
