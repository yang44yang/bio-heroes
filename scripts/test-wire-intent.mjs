// test-wire-intent.mjs —— intent 消息（guest → host）的守卫。
//
// 守两样东西：
//   ① **decodeIntent 是投影器，不是校验器** —— guest 无处可写 side/awakenOpts
//   ② ★ **slot 跨镜像恒等** —— buildSync 出口 → decodeIntent 入口的**端到端闭环**
//
// ⚠️ 与 test-side-symmetry 的分工：那边守 **mirror 本身**（:68 已逐槽位断言 field 随子树走，
//    把 mirror 改成 .reverse() 那边就是红的）。本文件守的是**不同的东西**：wire 出口到 intent
//    入口的闭环 —— 含「有人给 intent 加了个镜像」这个变异，那条 test-side-symmetry 覆盖不到。
//
// ☠️ **两个守卫必须一起在**（test-no-side-fork 文件头的原话）：
//    source-grep 棘轮只能证明「不能命名 raw.side」；证明不了「拿了 seat 又忽略它」。
//    **缺一个就是剧场。** 本文件 ① 是棘轮、② 是行为，两条都在。

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { initialBattleState, battleReducer } from '../src/engine/battleReducer.js'
import { PLAYER, ENEMY, opp } from '../src/engine/sides.js'
import { MAX_FIELD_SLOTS } from '../src/data/deckRules.js'
import CARDS from '../src/data/cards.js'
import {
  PROTOCOL_VERSION, INTENT_KINDS, INTENT_FIELDS, LEADER_SLOT,
  encodeIntent, decodeIntent, buildSync, acceptIntent, seedN,
  encodeResume, decodeResume,
} from '../src/engine/wire.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(root, p), 'utf8')
let pass = 0
const fails = []
const assert = (cond, msg) => { if (cond) pass++; else fails.push(msg) }
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/**
 * 剥注释器 —— **逐字复制自 test-no-side-fork.mjs**（它认字符串）。
 * ☠️ 两次血账：test-api-proxy 的初版正则匹配到了**注释里**的 `ws: true`；同一个文件里
 *    URL 的 `//` 被当成行注释。凡 source-grep 必须先剥注释，且**剥注释器本身要有自检**，
 *    否则棘轮全是空转 —— 那正是「守卫即剧场」的样子。
 */
function stripComments(src) {
  let out = ''
  let i = 0
  let mode = 'code'
  while (i < src.length) {
    const c = src[i], n = src[i + 1]
    if (mode === 'code') {
      if (c === '/' && n === '/') { mode = 'line'; i += 2; continue }
      if (c === '/' && n === '*') { mode = 'block'; i += 2; continue }
      if (c === "'") mode = 'sq'
      else if (c === '"') mode = 'dq'
      else if (c === '`') mode = 'tpl'
      out += c; i++; continue
    }
    if (mode === 'line') { if (c === '\n') { mode = 'code'; out += c }; i++; continue }
    if (mode === 'block') { if (c === '*' && n === '/') { mode = 'code'; i += 2 } else i++; continue }
    out += c
    if (c === '\\') { out += src[i + 1] ?? ''; i += 2; continue }
    if ((mode === 'sq' && c === "'") || (mode === 'dq' && c === '"') || (mode === 'tpl' && c === '`')) {
      if (out.length > 1) mode = 'code'
    }
    i++
  }
  return out
}

// ---- ⓪ 剥注释器自检（不做这个，下面的棘轮全是空转）----
{
  assert(!stripComments('const a = 1 // raw.side\n').includes('raw.side'), '⓪ 行注释里的字面量被剥掉了')
  assert(stripComments('const a = "raw.side"\n').includes('raw.side'), '⓪ 代码里的字符串字面量被保留')
  assert(!stripComments('/* raw.side */const a=1').includes('raw.side'), '⓪ 块注释被剥掉了')
}

const wireSrc = stripComments(read('src/engine/wire.js'))

// ---- fixture（真卡 + 真 reducer）----
const byId = (id) => {
  const c = CARDS.find((x) => x.id === id)
  if (!c) throw new Error(`fixture 卡不存在: ${id} —— cards.js 改了？`)
  return c
}
const onField = (card, uid) => ({ ...card, uid, currentHp: card.hp, maxHp: card.hp, statuses: [] })

let S = structuredClone(initialBattleState)
// ★ slot 0 / 4：MAX_FIELD_SLOTS-1-1 = 4 且 -1-4 = 1 —— **1 和 4 恰好互换**，用它们会让
//   「镜像 slot」这个变异静默通过。6-1-0=5≠4、6-1-4=1≠0 → 转置/镜像/反查三类变异全被抓住。
S.player.field[0] = onField(byId('blue_whale_titan'), 'player_whale_0')
S.enemy.field[4] = onField(byId('flu_virus'), 'enemy_flu_4')
S = battleReducer(S, { type: 'MARK_ATTACKED', side: PLAYER, uid: 'player_whale_0' })

const sources = {
  [PLAYER]: { hand: [], drawPileCount: 14, spChoice: null },
  [ENEMY]: { hand: [], drawPileCount: 15, spChoice: null },
}
const G = 'm_test'
const ok = (kind, payload) => ({ v: PROTOCOL_VERSION, t: 'intent', g: G, n: 1, kind, ...payload })

// ================================================================
//  ① 棘轮 —— 「不能命名 raw.side」
// ================================================================
{
  // 变异：把 decodeIntent 写成 `side: raw.side ?? seat` → 红。
  const hits = [...wireSrc.matchAll(/raw\s*\.\s*side/g)].map((m) => m[0])
  assert(hits.length === 0,
    `① wire.js 里出现了 ${hits.join(', ')} —— **座位由连接给，guest 从不自选**。\n` +
    '      「host 忽略 raw.side」是运行时纪律，活在一行 if 里，而那行 if 会被下一个 `?? raw.side`\n' +
    '      悄悄拆掉：静默、build 通过，只有真机对战时齐齐的回合被偷走。')
  assert([...wireSrc.matchAll(/\bside\s*:\s*raw\./g)].length === 0, '① 不得把 raw 的任何字段当作 side')

  // ①b 白名单即能力面。变异：往 INTENT_KINDS 加 'preplace' → 红。
  assert(deepEq([...INTENT_KINDS].sort(),
    ['answer', 'attack', 'breakBank', 'endMain', 'endTurn', 'mulligan', 'play', 'playEvent', 'spChoose']),
    `①b INTENT_KINDS 变了：${[...INTENT_KINDS].sort().join(',')} —— 白名单**即 guest 的能力面**，改它请先想清楚。`)
  for (const bad of ['preplace', 'addLog', 'startBattle', 'startPlayerTurn', 'setPlayerField', 'pushSkillEvents', 'tryQuiz', 'concede', 'dismissEnv']) {
    assert(!INTENT_KINDS.includes(bad),
      `①b INTENT_KINDS 里出现了 \`${bad}\` —— 白名单是**冻结枚举，不是转发任意方法名**。\n` +
      '      preplaceCard 是作弊入口，**绕过全部规则**：能表达它 = guest 凭空摆任意卡。')
  }
  assert(Object.isFrozen(INTENT_KINDS), '①b INTENT_KINDS 必须冻结')

  // ①c **数据棘轮**（不是 source-grep → 不脆）。变异：给 attack 的 spec 加 'awakenOpts' → 红。
  for (const [kind, spec] of Object.entries(INTENT_FIELDS)) {
    for (const k of ['side', 'seat', 'owner', 'awakenOpts', 'damageMultiplier', 'card']) {
      assert(!spec.includes(k),
        `①c INTENT_FIELDS.${kind} 里出现了 \`${k}\`。\n` +
        '      side/seat/owner → 座位由连接给；card → guest 能伪造卡面；\n' +
        '      awakenOpts/damageMultiplier → 今天 BattleScreen 在**客户端**算科学家模式的倍率并把\n' +
        '      answerQuiz 的返回原样透传给 attack。guest 能发就能发 {damageMultiplier: 999}。\n' +
        '      host 必须按自己权威的 quiz 结果重算 —— 而「重算」不会被忘记，**因为参数根本传不进来**。')
    }
  }

  // ①d 协议不带表现层。变异：把 tone 改回 color class → 红。
  // ⚠️ 正则**构造**出来，不写 class 实例 —— Tailwind v4 无 config，扫全项目**含 scripts/、含注释**，
  //    写在这里的 class 字面量会变成生产 CSS 里的死规则。
  assert(!new RegExp("['\"]text-\\w+-\\d+['\"]").test(wireSrc),
    '①d wire.js 里不得有 tailwind class —— tone 是**语义 token**，表现层不入协议')
}

// ================================================================
//  ② ★ 行为 —— 「拿了 seat 且真用了」（棘轮证明不了这个）
// ================================================================
{
  // 变异：`side: raw.side ?? seat` → 红。
  const dec = decodeIntent({ ...ok('attack', { atkSlot: 0, defSlot: 1 }), side: PLAYER }, ENEMY)
  assert(dec.ok && dec.intent.side === ENEMY,
    '② ★ guest 自称 player，host 必须按**连接的座位**判定为 enemy。\n' +
    '      ①的棘轮只能证明「不能命名 raw.side」，证明不了「拿了 seat 又忽略它」——\n' +
    '      **缺一个就是剧场**（test-no-side-fork 文件头原话）。')
  assert(decodeIntent({ ...ok('attack', { atkSlot: 0, defSlot: 1 }), side: PLAYER }, PLAYER).intent.side === PLAYER,
    '② 对称：seat=player 时判定为 player')
}

// ================================================================
//  ③ 投影器性质
// ================================================================
{
  // 变异：把投影改成 `{...raw, side: seat}` → 红。
  // ★ 一条同时挡住 awakenOpts 注入和**一切未来的垃圾字段**。
  const dec = decodeIntent({
    ...ok('attack', { atkSlot: 0, defSlot: 1 }),
    awakenOpts: { damageMultiplier: 999 }, side: PLAYER, junk: 'x',
  }, ENEMY)
  assert(deepEq(Object.keys(dec.intent).sort(), ['atkSlot', 'defSlot', 'kind', 'side']),
    `③ ★ intent 必须是**投影**，实际字段：${Object.keys(dec.intent).sort().join(',')}\n` +
    '      注入的 side/awakenOpts/damageMultiplier 应在 host 看到它之前就不存在。')

  // ③b 变异：删掉 kind 检查 → 第一条红；从 INTENT_KINDS 删掉 attack → 第二组红。
  assert(decodeIntent(ok('nuke', {}), ENEMY).reason === 'kind', '③b 未知 kind 拒')
  const good = {
    play: { uid: 'enemy_x_1', slot: 2 },
    playEvent: { uid: 'enemy_evt_1' },
    attack: { atkSlot: 0, defSlot: LEADER_SLOT },
    answer: { qid: 'q_1024', choice: 2 },
    mulligan: { uids: ['enemy_x_0'] },
    endMain: {}, endTurn: {}, breakBank: {},
    spChoose: { uid: 'sp_e_1' },
  }
  for (const k of INTENT_KINDS) {
    // 正向：防「白名单收太紧，游戏没法玩」
    assert(decodeIntent(ok(k, good[k]), ENEMY).ok === true, `③b 合法的 ${k} 必须过（正向覆盖）`)
  }

  // ③c 边界。变异：`< MAX_FIELD_SLOTS` 改成 `<=` → 第一条红。
  // ☠️ 后两条**必须都在** —— 只测一条会让「所有 slot 都允许 -1」溜过去。
  assert(decodeIntent(ok('play', { uid: 'x', slot: MAX_FIELD_SLOTS }), ENEMY).reason === 'payload', '③c play 的 slot 越界拒')
  assert(decodeIntent(ok('play', { uid: 'x', slot: LEADER_SLOT }), ENEMY).reason === 'payload',
    '③c ★ play 的 slot **不许**是主人（-1）—— 只测 attack 那条会让「所有 slot 都允许 -1」溜过去')
  assert(decodeIntent(ok('attack', { atkSlot: 0, defSlot: LEADER_SLOT }), ENEMY).ok === true,
    '③c ★ attack 的 defSlot **允许**主人（-1）= 直攻')
  assert(decodeIntent(ok('spChoose', { uid: null }), ENEMY).ok === true, '③c spChoose 的 uid:null = 跳过')
}

// ================================================================
//  ④ ★★ slot 跨镜像恒等（端到端，真状态，不手搓）
// ================================================================
{
  // ☠️ **必须用 seat = ENEMY 建 view**：seat = PLAYER 时 mirror 不发生，恒等恒成立 = 结构性瞎
  //    （与 mirror 漏翻 activeSide/winner 同族的不动点陷阱）。
  const view = buildSync({ state: S, sources, ring: [], to: ENEMY, since: 0, ack: 0, g: G }).state

  // guest 在**自己的视角**里选中：我的卡在 player 侧，对手的卡在 enemy 侧。
  const i = view.player.field.findIndex((c) => c && c.id === 'flu_virus')
  const j = view.enemy.field.findIndex((c) => c && c.id === 'blue_whale_titan')
  assert(i === 4 && j === 0, `④ 前提自检：guest 视角里 i=4, j=0（实际 i=${i}, j=${j}）`)

  const dec = decodeIntent(encodeIntent('attack', { atkSlot: i, defSlot: j }, 1, G), ENEMY)
  assert(dec.ok, '④ intent 解析成功')
  assert(dec.intent.atkSlot !== dec.intent.defSlot,
    '④ ★ fixture 自身必须非对称，否则本组对「转置」是结构性瞎的')

  // ☠️ 三个变异，一个都不能少：
  //   ① 在 encodeIntent/decodeIntent 里给 slot 加「镜像」MAX_FIELD_SLOTS-1-slot → 红
  //      （**这正是那个好心人会干的事** —— 他看到「快照翻了、intent 没翻」，顺手补上）
  //   ② 在 mirror 里加 field: [...s.enemy.field].reverse() → 红（钉住「mirror 不重排数组」这条前提）
  //   ③ 把 attack 的 foe = opp(side) 改成硬编码 → 这条**测不到**（attack 在 hook 里）。
  //      那条恒等的第二个前提由 test-side-symmetry 守，不是这里。
  assert(S[dec.intent.side].field[dec.intent.atkSlot]?.id === 'flu_virus',
    '④ ★★ guest 选中的卡 === host 解析出的卡（攻击方）。\n' +
    '      **正确答案是「什么都不做」** —— mirror 是 side **标签**的置换，不是 slot **下标**的置换。\n' +
    '      危险也正在这里：三个月后有人会「贴心地」给 intent 加个镜像，guest 的 slot 4 变成 host 的\n' +
    '      slot 1，不报错、不变红。')
  assert(S[opp(dec.intent.side)].field[dec.intent.defSlot]?.id === 'blue_whale_titan',
    '④ ★★ guest 瞄准的卡 === host 解析出的卡（防守方）')
}

// ================================================================
//  ⑤ 去重 / 重连
// ================================================================
{
  // 变异：`n > lastN` 改成 `>=` → 第二条红；seedN = () => 1 → 最后一条红；删 'reset' 分支 → 第四条红。
  assert(acceptIntent(7, 8).ok === true, '⑤ 新的 n 接受')
  assert(acceptIntent(7, 7).reason === 'dup',
    '⑤ 重放必须拒 —— 实测后果：一条 play 被重放 → canPlayCard **不查这张 uid 还在不在手上**\n' +
    '      → **二次扣能量 + 场上多一张同 uid 的卡**（MARK_SUMMONED 靠 includes 幂等，field 写入不是；\n' +
    '      唯一的天然 gate 在 useHand.playCard，而它在引擎**之后**调）。\n' +
    '      引擎里只有 attack 和 breakPowerBank 有天然 gate。')
  assert(acceptIntent(7, 3).reason === 'dup', '⑤ 迟到的旧 n 拒')
  assert(acceptIntent(20, 1).reason === 'reset',
    '⑤ ★ n 回到 1 是**计数器归零的强信号**（guest 刷新了页面），不是普通的 dup。\n' +
    '      adapter 该弹「请重新连接」，而不是让齐齐对着死按钮点二十次。')
  assert(seedN(12) === 13 && acceptIntent(12, seedN(12)).ok === true,
    '⑤ seedN(ack) 是新连接的 n 起点（协议规定），且它必须真的能被接受')

  // resume：guest 是自己 n 的真相源，host 只是缓存
  const r = decodeResume(encodeResume(1184, 42, G))
  assert(r.ok && r.lastSeen === 1184 && r.lastN === 42,
    '⑤ resume 承载 lastN —— 挡死「guest 刷新 → n 归零 → acceptIntent(20, 1..20) 全 false\n' +
    '      → 齐齐点什么都没反应，**永久性的**」')
}

// ================================================================
//  ⑥ 版本 / 局次
// ================================================================
{
  // 变异：删 g 检查 → 第一条红。线上后果：host 点了「重新开始」，guest 的旧 intent 打进新局。
  const dec = decodeIntent(ok('attack', { atkSlot: 0, defSlot: 1 }), ENEMY)
  assert(dec.ok && dec.g === G, '⑥ g 原样带出 —— 局次比对由 adapter 做（wire 不持状态，不知道「当前是哪局」）')
  assert(decodeIntent({ ...ok('attack', { atkSlot: 0, defSlot: 1 }), v: PROTOCOL_VERSION + 1 }, ENEMY).reason === 'version',
    '⑥ 版本不符拒')
  assert(decodeIntent({ ...ok('attack', { atkSlot: 0, defSlot: 1 }), t: 'sync' }, ENEMY).reason === 'type', '⑥ 类型不符拒')
  assert(decodeIntent(null, ENEMY).reason === 'shape', '⑥ 垃圾输入不崩')
}

assert(pass > 30, `⑦ 断言真的跑了（实测 ${pass} 条）`)

if (fails.length) {
  console.error(`❌ test-wire-intent: ${fails.length} 条失败`)
  for (const f of fails) console.error('   · ' + f)
  process.exit(1)
}
console.log(`✅ test-wire-intent: ${pass} 条断言通过`)
