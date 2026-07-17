// test-side-symmetry.mjs —— 「两侧规则完全一致」的镜像测试（de-fork S7）。
//
// 为什么有这个文件：
//   de-fork 的**全部价值**就是「guest 与 host 按同一套规则玩」。那个断言必须是
//   **机械可验证**的，不能靠人肉审阅 —— 而在 S0-S6 之前它根本无法表达：规则住在
//   React hook 的 useCallback 里，Node invoke 不了；一卡一次靠 useAITurn 那个 for
//   循环的形状兜着；「敌方的 main 相位」压根不存在。
//   S1(纯谓词) + S2(标记进 state) + S3(activeSide + 每侧 phase) 之后，每个 gate 都成了
//   「单个 JSON-clean 值的纯函数」——**镜像测试这才成为可能**。
//
// 做法：把一个局面**镜像**（两侧子树对调 + 翻 activeSide + 翻 winner），
//   然后断言 `fn(st, 'player')` 与 `fn(mirror(st), 'enemy')` **给出完全相同的判定**。
//   如果规则里任何一处偏袒某一侧，这里就会红。
//
// ⚠️⚠️ **本文件最大的陷阱：对合测试 `mirror(mirror(s)) === s` 对「漏翻 winner」是结构性瞎的。**
//   winner 是 swap 的**不动点** —— 漏翻它，round-trip 照样恒等、断言照样绿，
//   而线上后果是**输的那个孩子看到胜利画面**。activeSide 同理。
//   所以本文件**逐字段显式断言侧别值翻转**（见 ⓪），不只做 round-trip。
//
// 覆盖：
//   ⓪ mirror 自身的正确性（含上面那个陷阱的显式防守）
//   ① rules.js 三个导出 × 一批真实局面 → 两侧判定必须逐字相同
//   ② battleReducer 的镜像不变式：reducer(mirror(s), mirrorAction(a)) === mirror(reducer(s, a))
//   ③ derivePhase 的镜像语义（它**刻意不对称** —— 那是旧 API 的形状，不是 bug）

import { initialBattleState, battleReducer, derivePhase } from '../src/engine/battleReducer.js'
import { canPlayCard, canAttackFrom, canTargetSlot } from '../src/engine/rules.js'
// mirror 现在住 src/engine/sides.js（生产代码要用它 —— wire 边界就靠它）。
// 本文件仍是它的**主要守卫**：⓪ 逐字段断言侧别值翻转（round-trip 对那个 bug 是瞎的）。
import { PLAYER, ENEMY, mirror } from '../src/engine/sides.js'
import CARDS from '../src/data/cards.js'

let pass = 0
const fails = []
const assert = (cond, msg) => { if (cond) pass++; else fails.push(msg) }
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b)

const byId = (id) => {
  const c = CARDS.find((x) => x.id === id)
  if (!c) throw new Error(`fixture 卡不存在: ${id} —— cards.js 改了？`)
  return c
}
const onField = (card, over = {}) => ({
  ...card, uid: `test_${card.id}`, currentHp: card.hp, maxHp: card.hp, statuses: [], ...over,
})

const WHALE = byId('blue_whale_titan')   // Guard
const CHEETAH = byId('cheetah_sprinter') // Swift Attack
const FLU = byId('flu_virus')
const ORCA = byId('orca_alpha')          // factionRequirement nature×2
const ANT = byId('ant_soldier')
const BEE = byId('bee_worker')


// ---- ⓪ mirror 自身的正确性 ----
{
  const s = structuredClone(initialBattleState)
  s.activeSide = PLAYER
  s.player.energy = 3
  s.enemy.energy = 9
  s.player.field[0] = onField(CHEETAH)
  s.enemy.field[1] = onField(WHALE)
  s.player.attacked = ['a1']
  s.enemy.summoned = ['e1']

  const m = mirror(s)
  assert(m.player.energy === 9 && m.enemy.energy === 3, '⓪ 子树对调')
  assert(m.player.field[1]?.id === WHALE.id && m.enemy.field[0]?.id === CHEETAH.id, '⓪ 战场随子树走')
  assert(deepEq(m.enemy.attacked, ['a1']) && deepEq(m.player.summoned, ['e1']), '⓪ 回合标记随子树走')

  // ★ 陷阱防守：这两条是 round-trip **抓不到**的
  assert(m.activeSide === ENEMY, '⓪ ★ activeSide 必须翻（round-trip 对它是瞎的 —— 它是 swap 的不动点）')
  const won = { ...s, winner: PLAYER }
  assert(mirror(won).winner === ENEMY,
    '⓪ ★ winner 必须翻 —— 漏翻的线上后果是**输的那个孩子看到胜利画面**，而 mirror(mirror(x))===x 照样绿')
  assert(mirror({ ...s, winner: null }).winner === null, '⓪ winner=null 时保持 null')

  // 对合（补充，不是主力）
  assert(deepEq(mirror(mirror(s)), s), '⓪ mirror 是对合（补充断言 —— 它单独不足以证明正确）')
}

// ---- 一批真实局面（每个都从真 initialBattleState 改，不手搓）----
function scenarios() {
  const out = []
  const base = () => structuredClone(initialBattleState)

  // 出牌相关
  for (const phase of ['init', 'mulligan', 'main', 'battle', 'ended']) {
    for (const active of [PLAYER, ENEMY]) {
      const s = base(); s.activeSide = active; s.player.phase = phase; s.enemy.phase = phase
      s.player.energy = 3; s.enemy.energy = 3
      out.push({ name: `play/phase=${phase}/active=${active}`, s })
    }
  }
  // 能量边界
  for (const e of [0, CHEETAH.cost - 1, CHEETAH.cost, CHEETAH.cost + 1, 10]) {
    const s = base(); s.activeSide = PLAYER; s.player.phase = 'main'; s.enemy.phase = 'main'
    s.player.energy = e; s.enemy.energy = e
    out.push({ name: `play/energy=${e}`, s })
  }
  // 阵营标记
  {
    const s = base(); s.activeSide = PLAYER; s.player.phase = 'main'; s.enemy.phase = 'main'
    s.player.energy = 10; s.enemy.energy = 10
    s.player.discard = [{ ...ANT }, { ...BEE }]
    s.enemy.discard = [{ ...ANT }, { ...BEE }]
    out.push({ name: 'play/markers-both-satisfied', s })
    const s2 = structuredClone(s); s2.enemy.discard = []
    out.push({ name: 'play/markers-asymmetric', s: s2 })
  }
  // 攻击 / 守护
  {
    const s = base(); s.activeSide = PLAYER; s.player.phase = 'battle'; s.enemy.phase = 'battle'
    s.player.field[0] = onField(CHEETAH); s.enemy.field[0] = onField(CHEETAH)
    out.push({ name: 'atk/no-guard', s })

    const g = structuredClone(s)
    g.player.field[1] = onField(WHALE); g.enemy.field[1] = onField(WHALE)
    out.push({ name: 'atk/both-have-guard', s: g })

    const g2 = structuredClone(s); g2.enemy.field[1] = onField(WHALE)
    out.push({ name: 'atk/only-enemy-has-guard', s: g2 })

    const g3 = structuredClone(s); g3.player.field[1] = onField(WHALE)
    out.push({ name: 'atk/only-player-has-guard', s: g3 })

    const dead = structuredClone(g); dead.enemy.field[1].currentHp = 0; dead.player.field[1].currentHp = 0
    out.push({ name: 'atk/guard-dead', s: dead })

    const sleep = structuredClone(s)
    sleep.player.field[0].statuses = [{ type: 'sleep' }]; sleep.enemy.field[0].statuses = [{ type: 'sleep' }]
    out.push({ name: 'atk/sleep', s: sleep })

    const fatigue = structuredClone(s)
    fatigue.player.summoned = [`test_${CHEETAH.id}`]; fatigue.enemy.summoned = [`test_${CHEETAH.id}`]
    out.push({ name: 'atk/summoned(swift-exempt)', s: fatigue })

    const whaleFat = structuredClone(s)
    whaleFat.player.field[0] = onField(WHALE); whaleFat.enemy.field[0] = onField(WHALE)
    whaleFat.player.summoned = [`test_${WHALE.id}`]; whaleFat.enemy.summoned = [`test_${WHALE.id}`]
    out.push({ name: 'atk/summoned(no-swift)', s: whaleFat })

    const atkd = structuredClone(s)
    atkd.player.attacked = [`test_${CHEETAH.id}`]; atkd.enemy.attacked = [`test_${CHEETAH.id}`]
    out.push({ name: 'atk/already-attacked', s: atkd })

    const mixed = structuredClone(s)
    mixed.enemy.field[2] = onField(FLU); mixed.player.field[2] = onField(FLU)
    mixed.enemy.field[1] = onField(WHALE); mixed.player.field[1] = onField(WHALE)
    out.push({ name: 'atk/guard+others', s: mixed })
  }
  // 胜负
  for (const w of [null, PLAYER, ENEMY]) {
    const s = base(); s.activeSide = PLAYER; s.player.phase = 'battle'; s.enemy.phase = 'battle'; s.winner = w
    s.player.field[0] = onField(CHEETAH); s.enemy.field[0] = onField(CHEETAH)
    out.push({ name: `winner=${w}`, s })
  }
  return out
}

// ---- ① rules.js：两侧判定必须逐字相同 ----
{
  const cases = scenarios()
  let checked = 0
  for (const { name, s } of cases) {
    const m = mirror(s)

    for (const [label, card] of [['cheetah', CHEETAH], ['orca', ORCA]]) {
      for (const slot of [-1, 0, 3, 99]) {
        const a = canPlayCard(s, PLAYER, card, slot)
        const b = canPlayCard(m, ENEMY, card, slot)
        assert(deepEq(a, b),
          `① canPlayCard 不对称 @${name} card=${label} slot=${slot} — player=${JSON.stringify(a)} vs 镜像后 enemy=${JSON.stringify(b)}`)
        checked++
      }
    }

    for (const slot of [0, 1, 2, 5]) {
      const marksP = { summonedThisTurn: s.player.summoned, attackedThisTurn: s.player.attacked }
      const marksE = { summonedThisTurn: m.enemy.summoned, attackedThisTurn: m.enemy.attacked }
      const a = canAttackFrom(s, PLAYER, slot, marksP)
      const b = canAttackFrom(m, ENEMY, slot, marksE)
      assert(deepEq(a, b),
        `① canAttackFrom 不对称 @${name} slot=${slot} — player=${JSON.stringify(a)} vs 镜像后 enemy=${JSON.stringify(b)}`)
      checked++

      const atkCard = s.player.field[slot]
      if (atkCard) {
        for (const def of [-1, 0, 1, 2]) {
          const x = canTargetSlot(s, PLAYER, atkCard, def)
          const y = canTargetSlot(m, ENEMY, m.enemy.field[slot], def)
          assert(deepEq(x, y),
            `① canTargetSlot 不对称 @${name} atk=${slot} def=${def} — player=${JSON.stringify(x)} vs 镜像后 enemy=${JSON.stringify(y)}`)
          checked++
        }
      }
    }
  }
  assert(checked > 400, `① 覆盖量够大（实测 ${checked} 次比对，${cases.length} 个局面）`)
}

// ---- ② battleReducer 的镜像不变式 ----
// reducer(mirror(s), mirrorAction(a)) 必须深等 mirror(reducer(s, a))
// —— 即「先镜像再走一步」与「先走一步再镜像」等价。任何一个 action 偏袒某一侧，这里就红。
{
  const mirrorSide = (side) => (side === PLAYER ? ENEMY : PLAYER)
  const mirrorAction = (a) => {
    const n = { ...a }
    if (n.side) n.side = mirrorSide(n.side)
    if (n.winner) n.winner = mirrorSide(n.winner)
    if (n.from) n.from = mirrorSide(n.from)
    if (n.to) n.to = mirrorSide(n.to)
    return n
  }

  const start = () => {
    const s = structuredClone(initialBattleState)
    s.activeSide = PLAYER
    s.player.phase = 'main'; s.enemy.phase = 'ended'
    s.player.energy = 5; s.enemy.energy = 7
    s.player.field[0] = onField(CHEETAH)
    s.enemy.field[0] = onField(WHALE)
    return s
  }

  const actions = [
    { type: 'ENERGY_SPEND', side: PLAYER, cost: 2 },
    { type: 'ENERGY_SET', side: ENEMY, value: 4 },
    { type: 'ENERGY_ADD', side: PLAYER, amount: 3, cap: 10 },
    { type: 'LEADER_DAMAGE', side: ENEMY, amount: 5000 },
    { type: 'LEADER_HEAL', side: PLAYER, amount: 1000, cap: 30000 },
    { type: 'POWERBANK_ADD', side: PLAYER, amount: 4 },
    { type: 'POWERBANK_RESTORE', side: ENEMY },
    { type: 'DISCARD_ADD', side: PLAYER, cards: [{ ...ANT, uid: 'x' }] },
    { type: 'DISCARD_SET', side: ENEMY, pile: [{ ...BEE, uid: 'y' }] },
    { type: 'MARK_SUMMONED', side: PLAYER, uid: 'u1' },
    { type: 'MARK_ATTACKED', side: ENEMY, uid: 'u2' },
    { type: 'MARKS_CLEAR', side: PLAYER, which: 'both' },
    { type: 'SIDE_PHASE_SET', side: PLAYER, phase: 'battle' },
    { type: 'TURN_HANDOFF', from: PLAYER, to: ENEMY },
    { type: 'TURN_HANDOFF', from: ENEMY, to: PLAYER },
    { type: 'GAME_OVER', winner: PLAYER },
    { type: 'GAME_OVER', winner: ENEMY },
    { type: 'WINNER_SET', winner: ENEMY },
    { type: 'TURN_SET', value: 8 },   // 无侧别 → 镜像后应完全一样
  ]

  for (const a of actions) {
    const s = start()
    const viaMirrorFirst = battleReducer(mirror(s), mirrorAction(a))
    const viaStepFirst = mirror(battleReducer(s, a))
    assert(deepEq(viaMirrorFirst, viaStepFirst),
      `② reducer 镜像不变式破了 @${a.type}(side=${a.side ?? a.from ?? a.winner ?? '-'})：` +
      `「先镜像再走一步」≠「先走一步再镜像」`)
  }

  // FIELD_UPDATE 的 value 是函数 → 单独测（updater 本身 side-blind）
  {
    const s = start()
    const bump = (prev) => prev.map((c) => (c ? { ...c, currentHp: Math.max(0, c.currentHp - 1000) } : c))
    const a = { type: 'FIELD_UPDATE', side: PLAYER, value: bump }
    assert(deepEq(battleReducer(mirror(s), mirrorAction(a)), mirror(battleReducer(s, a))),
      '② FIELD_UPDATE 的镜像不变式（updater 必须 side-blind）')
  }
}

// ---- ③ derivePhase 刻意不对称 —— 这是旧 API 的形状，不是 bug ----
{
  const s = structuredClone(initialBattleState)
  s.activeSide = PLAYER; s.player.phase = 'battle'; s.enemy.phase = 'ended'
  assert(derivePhase(s) === 'battle', '③ activeSide=player → 直接映射 player.phase')
  assert(derivePhase(mirror(s)) === 'enemyTurn',
    '③ ★ derivePhase **刻意不对称**：镜像后应得 enemyTurn 而非 battle。' +
    '它的职责就是「以玩家视角复述旧的顶层标量」，不是 side-blind 的 —— 这是设计，不是遗漏。' +
    'PvP 里 guest 拿到的是**镜像后的 state**，于是它看到的 phase 自然就是它自己的视角。')
}

// ---- 汇总 ----
if (fails.length) {
  console.error(`❌ test-side-symmetry: ${fails.length} 条失败`)
  for (const f of fails.slice(0, 12)) console.error('   · ' + f)
  if (fails.length > 12) console.error(`   … 另有 ${fails.length - 12} 条`)
  process.exit(1)
}
console.log(`✅ test-side-symmetry: ${pass} 条断言通过`)
