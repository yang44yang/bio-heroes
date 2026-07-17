// test-wire-privacy.mjs —— 「凡进 reducer 的东西 = 公开的」这条不变式的守卫。
//
// 为什么有这个文件（2026-07-17，PvP wire 格式已定后的第一道护栏）：
//   PvP 的公开通道是 `send(mirror(reducerState))` —— **整棵推给对手**。
//   于是 reducer 获得了一个它自己不知道的性质：**往里提升什么，就等于声明什么是公开的。**
//
//   这条约束在设计评审里才被挖出来，而它推翻了那个反射式的答案（「把 11 个 useState
//   全部提升进 reducer，推送就是 send(mirror(state))，多干净」）：
//     · 已核实 BattleScreen 只渲染 `enemySpDeck.length`（**数量**）→ SP 卡组**内容是隐藏信息**。
//       提升它 = 每推一次就把 SP 卡组内容寄给对面小孩。
//     · 手牌更甚：host 权威下 **host 的浏览器持有 guest 的手牌和抽牌堆**。手牌进 reducer
//       = mirror 每推一次就把齐齐的整副手牌寄给他对手。这不是隐私洁癖，这是整个游戏。
//   → 私有数据走 wire 的**私有通道**（只发给本人），不进 reducer。
//
// ⚠️ 本文件守的是**架构不变式**，不是某个函数的行为。它会在有人「顺手把手牌收进
//    reducer 好方便」时变红 —— 那个人多半是三个月后的我们自己，且当时会觉得很有道理。
//    往 reducer 里加字段前先问一句：**我愿意让对面小孩看见它吗？**
//
// 覆盖：
//   ① initialBattleState 不得含私有字段（手牌/抽牌堆/SP 卡组内容）
//   ② mirror 的产物必须 JSON-clean（它要上线）
//   ③ mirror 必须翻三样：两棵子树 + activeSide + winner
//      —— ★ 对合测试对后两个是**结构性瞎的**（不动点），故逐字段显式断言
//   ④ 已知的私有源仍在 reducer 之外（useHand / spDecks 的 useState）

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { initialBattleState, battleReducer } from '../src/engine/battleReducer.js'
import { mirror, PLAYER, ENEMY } from '../src/engine/sides.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0
const fails = []
const assert = (cond, msg) => { if (cond) pass++; else fails.push(msg) }

// ---- ① reducer 里不得有私有字段 ----
{
  // 「私有」= 只有拥有者该看见。命名上覆盖常见的写法，别指望以后的人用同一个词。
  const PRIVATE = [
    'hand', 'hands', 'drawPile', 'deck', 'drawpile',
    'spDeck', 'spDeckCards', 'spdeck',   // ⚠️ SP 卡组**内容**是隐藏的（UI 只显示 .length）
  ]
  const walk = (obj, path = '') => {
    if (!obj || typeof obj !== 'object') return
    for (const k of Object.keys(obj)) {
      const here = path ? `${path}.${k}` : k
      assert(!PRIVATE.includes(k),
        `① reducer 里出现了私有字段 \`${here}\` —— 它会被 mirror 整棵推给对手。\n` +
        `      公开通道 = send(mirror(state))，所以**进 reducer 就等于声明公开**。\n` +
        `      私有数据走 wire 的私有通道（只发给本人）。先问：我愿意让对面小孩看见它吗？`)
      walk(obj[k], here)
    }
  }
  walk(initialBattleState)
  assert(pass > 0, '① 遍历真的跑了')
}

// ---- ② mirror 的产物必须 JSON-clean（它要上线）----
{
  let s = structuredClone(initialBattleState)
  s = battleReducer(s, { type: 'MARK_ATTACKED', side: PLAYER, uid: 'player_whale_3' })
  s = battleReducer(s, { type: 'LEADER_DAMAGE', side: ENEMY, amount: 5000 })
  s = battleReducer(s, { type: 'DISCARD_ADD', side: PLAYER, cards: [{ id: 'ant_soldier', uid: 'player_ant_0' }] })
  const m = mirror(s)
  const round = JSON.parse(JSON.stringify(m))

  // ⚠️ **别写 `JSON.stringify(round) === JSON.stringify(m)`** —— 那个比较**恒真**，
  //   因为 round 本身就是 JSON.parse(JSON.stringify(m))：两边都过了 stringify，
  //   Set 在两边都塌成 `{}`，函数在两边都消失。它对「树里混了 Set/函数」是**结构性瞎的**
  //   —— 与 mirror 的不动点盲区同一族。本文件初版就是这么写的，是变异测试当场抓到的
  //   （把 `summoned: []` 换成 `new Set()`，测试照样绿）。
  //   正确做法：**直接在树上找非 JSON 类型**，不靠 round-trip 自证。
  const offenders = []
  const scan = (v, path) => {
    if (v === null || typeof v !== 'object') {
      if (typeof v === 'function') offenders.push(`${path} = function`)
      return
    }
    const tag = Object.prototype.toString.call(v)
    if (tag === '[object Set]' || tag === '[object Map]' || tag === '[object Date]' || tag === '[object RegExp]') {
      offenders.push(`${path} = ${tag}`)
      return
    }
    for (const k of Object.keys(v)) scan(v[k], `${path}.${k}`)
  }
  scan(m, 'state')
  assert(offenders.length === 0,
    `② mirror 的产物混了非 JSON 类型：${offenders.join(', ')} —— 上线时会**静默蒸发**` +
    `（JSON.stringify(new Set(['a'])) === '{}'），guest 拿到空对象、每张卡都显示可攻击`)

  // 正向：round-trip 后关键字段仍是**数组**且值对（类型丢失会让 [0] 变 undefined）
  assert(Array.isArray(round.enemy.attacked) && round.enemy.attacked[0] === 'player_whale_3',
    '② round-trip 后每侧标记仍是数组、值对，且已随子树对调')
  assert(round.player.leaderHp === 25000, '② round-trip 后数值无损（敌方主人挨了 5000 → 镜像后成 player）')
}

// ---- ③ mirror 翻三样（★ 对合测试对后两个是瞎的）----
{
  const s = structuredClone(initialBattleState)
  s.activeSide = PLAYER
  s.player.energy = 3; s.enemy.energy = 9
  const m = mirror(s)
  assert(m.player.energy === 9 && m.enemy.energy === 3, '③ 子树对调')
  assert(m.activeSide === ENEMY,
    '③ ★ activeSide 必须翻 —— 它是 swap 的**不动点**，round-trip 抓不到漏翻')
  assert(mirror({ ...s, winner: PLAYER }).winner === ENEMY,
    '③ ★ winner 必须翻 —— 同为不动点。漏翻的线上后果是**输的那个孩子看到胜利画面**，' +
    '而 mirror(mirror(x))===x 照样绿')
  assert(mirror({ ...s, winner: null }).winner === null, '③ winner=null 保持 null')
  // 不共享引用（推送前会被 JSON 序列化，但别让本地状态被镜像牵连）
  const m2 = mirror(s)
  m2.player.field[0] = { uid: 'x' }
  assert(s.enemy.field[0] === null, '③ mirror 必须深拷贝子树 —— 否则改镜像会污染源 state')
}

// ---- ④ 已知的私有源仍在 reducer 之外 ----
{
  const reducerSrc = readFileSync(join(root, 'src/engine/battleReducer.js'), 'utf8')
  // useHand 是手牌的家；它不该被 reducer 知道
  assert(!/useHand|drawPile|initDeck/.test(reducerSrc),
    '④ battleReducer 不得知道 useHand / drawPile —— 手牌是私有的，且 host 持有双方的手牌')

  const ub = readFileSync(join(root, 'src/hooks/useBattle.js'), 'utf8')
  assert(/const \[playerSpDeck, setPlayerSpDeck\] = useState|playerSpDeck.*useState/.test(ub),
    '④ SP 卡组仍应在 useState（reducer 之外）—— 它的**内容**是隐藏信息，UI 只显示 .length')

  // BattleScreen 只该渲染敌方 SP 的数量，不渲染内容 —— 这是「它是隐藏信息」的证据
  const bs = readFileSync(join(root, 'src/components/BattleScreen.jsx'), 'utf8')
  assert(/battle\.enemySpDeck\.length/.test(bs),
    '④ BattleScreen 应只读 enemySpDeck.length')
  assert(!/battle\.enemySpDeck\.map\(/.test(bs),
    '④ BattleScreen 不得渲染敌方 SP 卡组的**内容** —— 那是隐藏信息（今天只显示数量）')
}

if (fails.length) {
  console.error(`❌ test-wire-privacy: ${fails.length} 条失败`)
  for (const f of fails) console.error('   · ' + f)
  process.exit(1)
}
console.log(`✅ test-wire-privacy: ${pass} 条断言通过`)
