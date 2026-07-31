#!/usr/bin/env node
// 「对局快照 / host 自恢复」的清单守卫 + 纯核心往返测试（2026-07-31）
//
// 背景：PvP 是 host 权威，而整条 PvP 路径此前 localStorage 零使用 —— host 一刷新页面，
// 中继凭证和整棵棋盘一起蒸发，对局直接死（4g 场景）。中继侧本来就支持接回
// （房间只在两槽全空时才进回收，token 原封保留），缺的只有「新页面记得自己是谁」。
//
// ☠️ 这个方案唯一的高风险点是**漏一项 = 静默改规则**：reducer 树之外还挂着十几个权威 ref，
//    丢了棋盘上**完全看不出异常** —— 答案卡丢了那道题永远判不了卷、挂起的攻击凭空消失、
//    病毒 DoT 静默停掉、uid 撞车导致重复亡语。所以：
//
//    **本文件把 src/engine/matchSnapshot.js 的两张清单当作单一真相源，
//      逐条比对 useBattle.js / usePvpHost.js 里的每一处 useState/useRef/useReducer 声明。
//      新增一个而没登记 → 当场变红。**
//
// ☠️ 变异性（提交前逐个验过，全部变红）：
//   · 在 useBattle 里新增一个 `const fooRef = useRef(0)` 而不登记 → ① 红
//   · 把 RESTORED 里任一项删掉（当作"不用恢复"）→ ① 红（它还在源码里，但两张清单都不认它）
//   · unpackGate 不把 null 还原成 -Infinity → ② 红（**承重的是这一半**：packGate 侧的哨兵
//     只是让落盘可读，真正防住「冷却被静默清零」的是解包时的 null → -Infinity；
//     实测把 packGate 改成透传只会被 ⑦ 抓到，② 仍绿 —— 所以两条都要留）
//   · packSet 直接返回 Set（不转数组）→ ③ 红
//   · readSnapshot 不校验版本 / 不校验凭证 / 不校验过期 → ④ 红
//   · clampCursor 不设上界（信任快照里的值）→ ⑤ 红

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  RESTORED, NOT_RESTORED, SNAPSHOT_VERSION, SNAPSHOT_TTL_MS,
  packSet, unpackSet, packGate, unpackGate, packEnv, unpackEnv,
  clampCursor, packMatch, readSnapshot, isResumable,
} from '../src/engine/matchSnapshot.js'
import { battleReducer, initialBattleState } from '../src/engine/battleReducer.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }

// ---- ① 清单覆盖：源码里的每一处声明都必须被登记 ----
// 这是本文件存在的**全部理由**：让「漏掉一个 ref」从「三个月后真机上诡异行为」
// 变成「提交前 npm test 变红」。
const declsOf = (src) => {
  const names = []
  // const xxxRef = useRef(…) / const [xxx, setXxx] = useState(…) / useReducer(…)
  for (const m of src.matchAll(/const\s+(\w+)\s*=\s*use(?:Ref)\s*\(/g)) names.push(m[1])
  for (const m of src.matchAll(/const\s+\[\s*(\w+)\s*,[^\]]*\]\s*=\s*use(?:State|Reducer)\s*\(/g)) names.push(m[1])
  return [...new Set(names)]
}

const KNOWN = { ...RESTORED, ...NOT_RESTORED }
// 模块级 `let __fieldUidSeq` 不是 hook 声明，清单里叫 fieldUidSeq；两边都钉住
const ALIAS = { __fieldUidSeq: 'fieldUidSeq' }

for (const [file, label] of [
  ['src/hooks/useBattle.js', 'useBattle'],
  ['src/hooks/usePvpHost.js', 'usePvpHost'],
]) {
  const src = readFileSync(join(ROOT, file), 'utf8')
  const decls = declsOf(src)
  ok(`① ${label} 至少解析出 5 处声明（解析器失效会让本守卫静默全绿）`, decls.length >= 5)
  for (const name of decls) {
    const key = ALIAS[name] ?? name
    ok(`① ★ ${label} 的 \`${name}\` 必须在 matchSnapshot 的清单里登记（RESTORED 或 NOT_RESTORED）`
      + ` —— 没登记 = 续局时它会被静默丢掉，而棋盘上看不出任何异常`,
      Object.prototype.hasOwnProperty.call(KNOWN, key))
  }
}

// 反向锁：清单里登记的每一项都必须**真的还在源码里** ——
// 改名/删除后清单会变成谎言，而谎言的方向恰好是「看起来都登记了」。
{
  const all = readFileSync(join(ROOT, 'src/hooks/useBattle.js'), 'utf8')
    + readFileSync(join(ROOT, 'src/hooks/usePvpHost.js'), 'utf8')
  const SRC_NAME = { fieldUidSeq: '__fieldUidSeq' }   // 清单名 → 源码名
  for (const key of Object.keys(KNOWN)) {
    const name = SRC_NAME[key] ?? key
    ok(`① 反向锁：清单里的 \`${key}\` 在源码里仍存在（改名后清单会变成谎言）`,
      new RegExp(`\\b${name}\\b`).test(all))
  }
}

// ---- ① 补充：模块级 __fieldUidSeq 必须还在（清单登记的是它）----
{
  const ub = readFileSync(join(ROOT, 'src/hooks/useBattle.js'), 'utf8')
  ok('① useBattle 里仍有模块级 `__fieldUidSeq`（uid 序号；归零会与恢复回来的 fc_* 卡撞 uid）',
    /let\s+__fieldUidSeq/.test(ub))
  ok('① 清单登记了 fieldUidSeq', 'fieldUidSeq' in RESTORED)
}

// ---- ① 死代码不得被"顺手恢复"（那是在造第二个真相源）----
ok('① ★ summonedThisTurn / attackedThisTurn 必须留在 NOT_RESTORED —— 它们是死代码，'
  + '真相源是 battleState[side].summoned/attacked，恢复它们等于造第二个真相源',
  'summonedThisTurn' in NOT_RESTORED && 'attackedThisTurn' in NOT_RESTORED
  && !('summonedThisTurn' in RESTORED) && !('attackedThisTurn' in RESTORED))

// ---- ① 答案卡必须在 RESTORED，且清单里写明「不上 wire」----
ok('① ★ quizKeyRef（答案卡）必须恢复，且清单注明只存本机', 'quizKeyRef' in RESTORED
  && /不上 wire|永不上 wire|host 设备/.test(RESTORED.quizKeyRef))

// ---- ② -Infinity 往返（quizGate 的冷却语义）----
{
  const gate = { player: { fired: false, lastTurn: -Infinity }, enemy: { fired: true, lastTurn: 7 } }
  const round = unpackGate(JSON.parse(JSON.stringify(packGate(gate))))
  ok('② ★ quizGate 的 -Infinity 必须原样往返 —— 变成 null 的话 `turn - null >= 3` 恒真，'
    + '恢复后下一次攻击必出题、冷却被静默清零', round.player.lastTurn === -Infinity)
  ok('② quizGate 的普通值与 fired 标记原样往返',
    round.enemy.lastTurn === 7 && round.enemy.fired === true && round.player.fired === false)
  // 反向自检：不处理的话 JSON 确实会吃掉它（证明这条断言不是摆设）
  ok('② 自检：裸 JSON 往返确实会把 -Infinity 变成 null',
    JSON.parse(JSON.stringify({ x: -Infinity })).x === null)
}

// ---- ③ Set 往返 ----
{
  const s = new Set(['player:hp', 'enemy:hp'])
  const round = unpackSet(JSON.parse(JSON.stringify(packSet(s))))
  ok('③ ★ Set 必须转数组再往返 —— JSON.stringify(new Set([…])) 是 "{}"，直接存等于丢光',
    round instanceof Set && round.size === 2 && round.has('player:hp'))
  ok('③ 自检：裸 Set 过 JSON 确实是空对象', JSON.stringify(new Set(['a'])) === '{}')
  ok('③ 空/未定义当空集处理（恢复路径不该因为缺字段就抛）',
    unpackSet(undefined).size === 0 && packSet(null).length === 0)
}

// ---- ④ 环境事件只存 id（对象带 apply() 方法，不可 JSON 化）----
{
  const fakeEvent = { id: 'global_warming', name: '全球变暖', apply: () => {} }
  const packed = JSON.parse(JSON.stringify(packEnv({ event: fakeEvent, turnsLeft: 2 })))
  ok('④ 环境事件打包后只剩 id + turnsLeft（不含函数）',
    packed.id === 'global_warming' && packed.turnsLeft === 2 && !('apply' in packed))
  const back = unpackEnv(packed, (id) => (id === 'global_warming' ? fakeEvent : null))
  ok('④ 解包时由 lookup 反查回带 apply() 的真对象', typeof back.event.apply === 'function' && back.turnsLeft === 2)
  ok('④ lookup 找不到就返回 null（数据改版后不至于灌进半个事件）',
    unpackEnv(packed, () => null) === null)
}

// ---- ⑤ 游标只能往小里猜 ----
ok('⑤ ★ clampCursor 必须能被上界截断 —— lastN 恢复出比 guest 当前 n 大的值 = 他点什么都被判 dup、'
  + '界面永久卡死；cursor 大于环里最大 seq = 之后的事件永远被切掉', clampCursor(999, 12) === 12)
ok('⑤ 非法值一律归零（NaN/负数/undefined）',
  clampCursor(NaN) === 0 && clampCursor(-5) === 0 && clampCursor(undefined) === 0)
ok('⑤ 正常值原样通过', clampCursor(7, 100) === 7)

// ---- ⑥ readSnapshot 的四道拒收闸（半吊子地灌进去比不恢复危险得多）----
{
  const mk = (over = {}) => ({
    v: SNAPSHOT_VERSION, at: 1000, room: 'ABCD', token: 't',
    engine: { battleState: { player: {}, enemy: {}, winner: null } },
    ...over,
  })
  ok('⑥ 正常快照能读回', !!readSnapshot(mk(), 1000))
  ok('⑥ ★ 版本不符必须拒收（形状变了还灌 = 得到一个"看起来在打、其实规则错了"的局）',
    readSnapshot(mk({ v: SNAPSHOT_VERSION + 1 }), 1000) === null)
  ok('⑥ ★ 缺中继凭证必须拒收（没 token 回不去原房间，这份快照没用）',
    readSnapshot(mk({ token: null }), 1000) === null && readSnapshot(mk({ room: null }), 1000) === null)
  ok('⑥ ★ 过期必须拒收（三天后开游戏还问"继续上一局吗"是骚扰）',
    readSnapshot(mk(), 1000 + SNAPSHOT_TTL_MS + 1) === null)
  ok('⑥ 缺棋盘树必须拒收', readSnapshot(mk({ engine: {} }), 1000) === null)
  ok('⑥ 非法 JSON 字符串返回 null 而不是抛', readSnapshot('{不是json', 1000) === null)
  ok('⑥ 已分胜负的局不提示续局',
    !isResumable({ engine: { battleState: { winner: 'player' } } })
    && isResumable({ engine: { battleState: { winner: null } } }))
}

// ---- ⑦ packMatch 产出必须是 JSON-clean（含 Set / -Infinity / 带方法的对象也不例外）----
{
  const snap = packMatch({
    engine: {
      battleState: { player: { quiz: {} }, enemy: {}, winner: null },
      battleLog: ['a'],
      playerSpDeck: [], enemySpDeck: [],
      pendingSpSummon: null, pendingEnemySpSummon: null,
      spTriggeredRef: new Set(['player:hp']),
      playerInitLeaderHpRef: 30000, enemyInitLeaderHpRef: 30000,
      activeEnvEvent: { event: { id: 'e1', apply: () => {} }, turnsLeft: 1 },
      pendingEnvEvent: { id: 'e2', apply: () => {} },
      recentEventsRef: ['e1'],
      virusOutbreakRef: { playerAffected: true, enemyAffected: false, turnsLeft: 2 },
      battleStatsRef: { damage: 10 },
      quizGateRef: { player: { fired: false, lastTurn: -Infinity }, enemy: { fired: false, lastTurn: -Infinity } },
      quizKeyRef: { player: { qid: 'q1', correct: 2 }, enemy: null },
      quizSeqRef: 3,
      processedDeathsRef: new Set(['fc_x_1']),
      fieldUidSeq: 9,
    },
    adapter: { g: 'g1', lastN: 5, ring: [{ seq: 3 }], cursor: 3, pendingAttack: { atkSlot: 0, defSlot: 1 }, enemyMulliganed: true, bootstrapped: false },
    hands: { player: { hand: [{ uid: 'p1' }], drawPile: [], discard: [] }, enemy: { hand: [], drawPile: [], discard: [] } },
    meta: { at: 123, room: 'ABCD', token: 'tok', decks: { player: ['ant'], enemy: ['bee'] } },
  })
  const text = JSON.stringify(snap)
  ok('⑦ packMatch 产出可 JSON 序列化且不丢 Set', text.includes('player:hp') && text.includes('fc_x_1'))
  ok('⑦ 产出里不含任何函数（环境事件只留 id）', !text.includes('apply') && text.includes('"e1"') && text.includes('"e2"'))
  ok('⑦ -Infinity 以哨兵形式落地（不是 null）', text.includes('-inf'))
  ok('⑦ 中继凭证与卡组一并落地（缺一样都回不去原房间/冻不对卡组）',
    snap.room === 'ABCD' && snap.token === 'tok' && snap.decks.player[0] === 'ant')
  ok('⑦ 读回来能通过校验', !!readSnapshot(text, 123))
}

// ---- ⑧ reducer 的 HYDRATE 必须**按初始形状收口** ----
// ☠️ 这是整条恢复链上最容易静默炸的一环：wire.js 的 assertPublicShape 跑在 host
//    **每一次推送**上，逐路径比对 SHAPES[PROTOCOL_VERSION]。恢复进来的树只要多一个键
//    （旧快照 / 手改过的 localStorage / 将来加字段忘了 bump），下一帧推送当场抛错 →
//    被 usePvpHost 吞进 console.error → 快照停推、**guest 静默冻屏**，看起来像网络问题。
{
  const paths = (o, pre = '') => (o && typeof o === 'object' && !Array.isArray(o))
    ? Object.keys(o).sort().flatMap(k => paths(o[k], pre ? `${pre}.${k}` : k))
    : [pre]
  const base = paths(initialBattleState).join('|')

  const extra = battleReducer(initialBattleState, {
    type: 'HYDRATE',
    state: { ...initialBattleState, 偷偷加的字段: 1, player: { ...initialBattleState.player, 也偷偷加: 2 } },
  })
  ok('⑧ ★ HYDRATE 必须丢弃多余的键 —— 多一个键 = 下一帧推送 assertPublicShape 当场抛 → '
    + '快照停推、guest 静默冻屏（看起来像网络问题，最难查的那种）', paths(extra).join('|') === base)

  const missing = battleReducer(initialBattleState, {
    type: 'HYDRATE',
    state: { turn: 5, activeSide: 'enemy', player: { energy: 3 }, enemy: {} },
  })
  ok('⑧ ★ HYDRATE 必须给缺失的键补默认值 —— 半棵树比没有树更危险（能跑，但规则悄悄变了）',
    paths(missing).join('|') === base)
  ok('⑧ 缺失键补的是初始值、给到的键按快照走',
    missing.player.energy === 3 && missing.player.leaderHp === initialBattleState.player.leaderHp
    && missing.turn === 5 && missing.activeSide === 'enemy')

  ok('⑧ winner 只认三种合法值（脏值一律当没分胜负，避免恢复出一个"已结束"的死局）',
    battleReducer(initialBattleState, { type: 'HYDRATE', state: { winner: '乱写' } }).winner === null
    && battleReducer(initialBattleState, { type: 'HYDRATE', state: { winner: 'enemy' } }).winner === 'enemy')
  ok('⑧ activeSide 只认 player/enemy',
    battleReducer(initialBattleState, { type: 'HYDRATE', state: { activeSide: 'x' } }).activeSide === 'player')
  ok('⑧ 传入垃圾时原样返回旧状态（不炸、不半灌）',
    battleReducer(initialBattleState, { type: 'HYDRATE', state: null }) === initialBattleState)
}

console.log(`\n${fail === 0 ? '✅' : '⚠️'} test-match-snapshot: 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
