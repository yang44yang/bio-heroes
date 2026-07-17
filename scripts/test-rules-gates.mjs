// test-rules-gates.mjs —— 战斗规则守门人（engine/rules.js）的真测试。
//
// 为什么有这个文件（2026-07-17，de-fork S1）：
//   规则此前住在 useBattle 的 useCallback 里（`if (phase !== 'main') return`）。useBattle
//   是 React hook —— Node 能 import 模块（6cffff1 补了 .js 扩展名），但没有 renderer 就
//   invoke 不了。于是「规则对不对」历史上只能靠 readFileSync + 正则匹配源码文本来假装回答
//   （test-guard.mjs:3 / test-onDeath-routing.mjs:8 的注释里写明了这一点）。
//   把 gate 抽成 state 的纯函数之后，这个问题第一次可以被**真的**回答。
//
// ⚠️ **本文件的头号假绿风险：手搓 fixture。**
//   本项目已经被假绿烧过三次（partialAwaken 档、test-leader-damage 初版多传 friendlyField、
//   今天 test-sw-api-bypass 初版漏了 location.origin）。MEMORY 里的铁律是「engine 测试的
//   ctx 必须与生产调用点逐字段一致」。所以：
//     · state 一律从**真的** `initialBattleState` 深拷贝再改，绝不手写「长得像」的对象；
//     · 卡牌一律取**真的** cards.js 条目，绝不手写 {atk:1500, hp:1000}。
//   手搓的 fixture 只能证明「我以为的规则」自洽，证明不了生产会怎么跑。
//
// 覆盖（全部驱动真 rules.js，零源码正则）：
//   ① canPlayCard —— phase / 能量边界 / 槽位越界 / 阵营标记，且「占用不是拒绝理由」
//   ② canAttackFrom —— phase / 空位 / sleep / 召唤疲劳（含迅击豁免）/ 已攻击
//   ③ canTargetSlot —— 守护的两条不同规则（直攻主人 vs 打卡）+ 无视守护
//   ④ side 对称性 —— 同一份局面镜像后，两侧判定必须一致（S7 完整镜像测试的前哨）
//   ⑤ sides.js 的 opp/isSide 契约

import { initialBattleState } from '../src/engine/battleReducer.js'
import { canPlayCard, canAttackFrom, canTargetSlot } from '../src/engine/rules.js'
import { opp, isSide, PLAYER, ENEMY, SIDES } from '../src/engine/sides.js'
import { MAX_FIELD_SLOTS } from '../src/data/deckRules.js'
import CARDS from '../src/data/cards.js'

let pass = 0
const fails = []
const assert = (cond, msg) => { if (cond) pass++; else fails.push(msg) }
const eqReason = (got, want, msg) =>
  assert(got.reason === want, `${msg} — 期望 reason='${want}', 实得 '${got.reason}' (ok=${got.ok})`)

// ---- fixtures：真 state + 真卡 ----
const byId = (id) => {
  const c = CARDS.find((x) => x.id === id)
  if (!c) throw new Error(`fixture 卡不存在: ${id} —— cards.js 改了？`)
  return c
}
/** 把一张真卡变成「场上的卡」的样子（对齐 useBattle.makeFieldCard 的关键字段） */
const onField = (card, over = {}) => ({
  ...card, uid: `test_${card.id}`, currentHp: card.hp, maxHp: card.hp, statuses: [], ...over,
})
/** 从真的 initialBattleState 深拷贝 —— 不手搓 */
const freshState = (over = {}) => {
  const s = structuredClone(initialBattleState)
  return { ...s, ...over }
}

const WHALE = byId('blue_whale_titan')      // 有 Guard 技能（真守护卡）
const ORCA = byId('orca_alpha')             // factionRequirement: nature ×2 (check)
const CHEETAH = byId('cheetah_sprinter')    // 有 Swift Attack（迅击 → 免召唤疲劳）
const FLU = byId('flu_virus')                // 普通病原系卡（无守护、无需求）

// ---- ① canPlayCard ----
{
  const st = freshState({ phase: 'main' })
  st.player.energy = 3

  // phase
  for (const p of ['init', 'mulligan', 'battle', 'enemyTurn', 'over']) {
    eqReason(canPlayCard({ ...st, phase: p }, PLAYER, CHEETAH, 0), 'phase', `① phase='${p}' 不能出牌`)
  }
  assert(canPlayCard(st, PLAYER, CHEETAH, 0).ok, '① phase=main 可以出牌')

  // 能量边界：cost 恰好等于 energy → 可以；cost = energy+1 → 不行
  assert(canPlayCard({ ...st, player: { ...st.player, energy: CHEETAH.cost } }, PLAYER, CHEETAH, 0).ok,
    `① 能量恰好等于 cost(${CHEETAH.cost}) → 可出（边界：用的是 > 不是 >=）`)
  eqReason(canPlayCard({ ...st, player: { ...st.player, energy: CHEETAH.cost - 1 } }, PLAYER, CHEETAH, 0),
    'energy', '① 能量少 1 → 拒绝')

  // 槽位越界
  eqReason(canPlayCard(st, PLAYER, CHEETAH, -1), 'slot', '① slot=-1 越界')
  eqReason(canPlayCard(st, PLAYER, CHEETAH, MAX_FIELD_SLOTS), 'slot',
    `① slot=${MAX_FIELD_SLOTS} 越界（上界是 MAX_FIELD_SLOTS，不是硬编码 5/6）`)
  assert(canPlayCard(st, PLAYER, CHEETAH, MAX_FIELD_SLOTS - 1).ok, `① slot=${MAX_FIELD_SLOTS - 1} 是最后一个合法位`)

  // ⚠️ 占用**不是**拒绝理由 —— 替换是特性（占位者进弃牌堆）。
  const occupied = freshState({ phase: 'main' })
  occupied.player.energy = 9
  occupied.player.field[0] = onField(CHEETAH)
  assert(canPlayCard(occupied, PLAYER, CHEETAH, 0).ok,
    '① 格子被占用仍可出牌（替换是特性，不是错误）—— 别顺手补一道占用检查')

  // 阵营标记：ORCA 需要弃牌堆里 2 个 nature 标记
  const noMarks = freshState({ phase: 'main' })
  noMarks.player.energy = 10
  eqReason(canPlayCard(noMarks, PLAYER, ORCA, 0), 'markers',
    `① ${ORCA.name} 需 ${ORCA.factionRequirement.count} 个${ORCA.factionRequirement.faction}标记，弃牌堆空 → 拒绝`)

  const withMarks = freshState({ phase: 'main' })
  withMarks.player.energy = 10
  withMarks.player.discard = [byId('ant_soldier'), byId('bee_worker')].map((c) => ({ ...c }))
  const gotMarks = canPlayCard(withMarks, PLAYER, ORCA, 0)
  assert(gotMarks.ok, `① 弃牌堆有 2 张自然系 → ${ORCA.name} 可出，实得 reason='${gotMarks.reason}'`)

  // 阵营标记读的是**出牌方自己的**弃牌堆，不是对面的
  const oppMarks = freshState({ phase: 'main' })
  oppMarks.player.energy = 10
  oppMarks.enemy.discard = [byId('ant_soldier'), byId('bee_worker')].map((c) => ({ ...c }))
  eqReason(canPlayCard(oppMarks, PLAYER, ORCA, 0), 'markers',
    '① 标记必须数自己的弃牌堆 —— 对面的自然系卡不该让我方满足需求')
}

// ---- ② canAttackFrom ----
{
  const st = freshState({ phase: 'battle' })
  st.player.field[0] = onField(WHALE)
  const noMarks = { summonedThisTurn: new Set(), attackedThisTurn: new Set() }

  for (const p of ['init', 'mulligan', 'main', 'enemyTurn', 'over']) {
    eqReason(canAttackFrom({ ...st, phase: p }, PLAYER, 0, noMarks), 'phase', `② phase='${p}' 不能攻击`)
  }
  assert(canAttackFrom(st, PLAYER, 0, noMarks).ok, '② phase=battle 可以攻击')

  eqReason(canAttackFrom(st, PLAYER, 1, noMarks), 'empty', '② 空位不能攻击')
  const dead = freshState({ phase: 'battle' })
  dead.player.field[0] = onField(WHALE, { currentHp: 0 })
  eqReason(canAttackFrom(dead, PLAYER, 0, noMarks), 'empty', '② 0 HP 的卡不能攻击')

  // sleep
  const asleep = freshState({ phase: 'battle' })
  asleep.player.field[0] = onField(WHALE, { statuses: [{ type: 'sleep' }] })
  eqReason(canAttackFrom(asleep, PLAYER, 0, noMarks), 'sleep', '② 沉睡不能攻击')

  // 召唤疲劳 + 迅击豁免
  const summoned = { summonedThisTurn: new Set([`test_${WHALE.id}`]), attackedThisTurn: new Set() }
  eqReason(canAttackFrom(st, PLAYER, 0, summoned), 'fatigue', '② 本回合召唤 → 疲劳')

  const swiftSt = freshState({ phase: 'battle' })
  swiftSt.player.field[0] = onField(CHEETAH)
  const swiftSummoned = { summonedThisTurn: new Set([`test_${CHEETAH.id}`]), attackedThisTurn: new Set() }
  assert(canAttackFrom(swiftSt, PLAYER, 0, swiftSummoned).ok,
    `② ${CHEETAH.name} 有迅击 → 召唤当回合即可攻击（疲劳豁免）`)

  // 已攻击
  const attacked = { summonedThisTurn: new Set(), attackedThisTurn: new Set([`test_${WHALE.id}`]) }
  eqReason(canAttackFrom(st, PLAYER, 0, attacked), 'attacked', '② 本回合已攻击 → 拒绝')

  // ⚠️ 顺序：sleep 必须**先于** fatigue（外壳靠这个顺序在中间插 confused 的重定向）
  const both = freshState({ phase: 'battle' })
  both.player.field[0] = onField(WHALE, { statuses: [{ type: 'sleep' }] })
  eqReason(canAttackFrom(both, PLAYER, 0, summoned), 'sleep',
    '② 同时沉睡+疲劳时必须报 sleep —— 顺序即规则，confused 的重定向夹在 sleep 与 fatigue 之间')
}

// ---- ③ canTargetSlot：守护的两条不同规则 ----
{
  // 对面有守护卡（蓝鲸）在 slot1，普通卡（猎豹）在 slot0
  const st = freshState({ phase: 'battle' })
  st.player.field[0] = onField(CHEETAH)
  st.enemy.field[0] = onField(FLU)
  st.enemy.field[1] = onField(WHALE)      // Guard
  const attacker = st.player.field[0]

  eqReason(canTargetSlot(st, PLAYER, attacker, -1), 'guard', '③ 对面有守护 → 不能直攻主人')
  eqReason(canTargetSlot(st, PLAYER, attacker, 0), 'guard', '③ 对面有守护 → 不能打非守护卡')
  assert(canTargetSlot(st, PLAYER, attacker, 1).ok,
    '③ 守护卡自己永远可以被打（否则有守护卡时谁都打不了 —— 这就是打卡那条比直攻主人多一个 !isGuardCard 的原因）')
  eqReason(canTargetSlot(st, PLAYER, attacker, 2), 'empty', '③ 空位不能打')

  // 守护卡死了 → 守护失效（fieldHasGuard 查 currentHp > 0）
  const guardDead = structuredClone(st)
  guardDead.enemy.field[1].currentHp = 0
  assert(canTargetSlot(guardDead, PLAYER, attacker, -1).ok, '③ 守护卡 0 HP → 守护失效，可直攻主人')
  assert(canTargetSlot(guardDead, PLAYER, attacker, 0).ok, '③ 守护卡 0 HP → 可打其它卡')

  // 无守护 → 都能打
  const noGuard = freshState({ phase: 'battle' })
  noGuard.player.field[0] = onField(CHEETAH)
  noGuard.enemy.field[0] = onField(FLU)
  assert(canTargetSlot(noGuard, PLAYER, noGuard.player.field[0], -1).ok, '③ 对面无守护 → 可直攻主人')
  assert(canTargetSlot(noGuard, PLAYER, noGuard.player.field[0], 0).ok, '③ 对面无守护 → 可打卡')

  // ⚠️ canTargetSlot 必须看**对面**的场（opp(side)），不是自己的
  const mineHasGuard = freshState({ phase: 'battle' })
  mineHasGuard.player.field[0] = onField(CHEETAH)
  mineHasGuard.player.field[1] = onField(WHALE)   // 守护在**我方**
  mineHasGuard.enemy.field[0] = onField(FLU)
  assert(canTargetSlot(mineHasGuard, PLAYER, mineHasGuard.player.field[0], -1).ok,
    '③ 我方有守护不该妨碍我方攻击 —— 守护查的是 opp(side) 的场')
}

// ---- ④ side 对称性（S7 完整镜像测试的前哨）----
// 同一份局面镜像后，两侧的判定必须完全一致。今天这条能过，是因为 rules.js 里没有侧别字面量。
{
  const mirror = (s) => ({ ...s, player: structuredClone(s.enemy), enemy: structuredClone(s.player) })

  const base = freshState({ phase: 'battle' })
  base.player.field[0] = onField(CHEETAH)
  base.enemy.field[0] = onField(FLU)
  base.enemy.field[1] = onField(WHALE)
  const m = mirror(base)

  const a = canTargetSlot(base, PLAYER, base.player.field[0], -1)
  const b = canTargetSlot(m, ENEMY, m.enemy.field[0], -1)
  assert(a.reason === b.reason, `④ 守护判定必须两侧一致 —— player 得 '${a.reason}', 镜像后 enemy 得 '${b.reason}'`)

  const noMarks = { summonedThisTurn: new Set(), attackedThisTurn: new Set() }
  const c = canAttackFrom(base, PLAYER, 0, noMarks)
  const d = canAttackFrom(m, ENEMY, 0, noMarks)
  assert(c.ok === d.ok && c.reason === d.reason, '④ 攻击资格判定必须两侧一致')

  const playSt = freshState({ phase: 'main' })
  playSt.player.energy = 1
  playSt.enemy.energy = 9
  const pm = mirror(playSt)
  assert(canPlayCard(playSt, PLAYER, CHEETAH, 0).reason === canPlayCard(pm, ENEMY, CHEETAH, 0).reason,
    '④ 能量判定必须读对应侧的 energy（镜像后 enemy 的 energy=1，判定应一致）')
}

// ---- ⑤ sides.js 契约 ----
{
  assert(opp(PLAYER) === ENEMY && opp(ENEMY) === PLAYER, '⑤ opp 互换两侧')
  assert(opp(opp(PLAYER)) === PLAYER, '⑤ opp 是对合')
  assert(SIDES.length === 2 && SIDES.includes(PLAYER) && SIDES.includes(ENEMY), '⑤ SIDES 恰好两侧')
  for (const bad of [undefined, null, '', 'Player', 'host', 0, 'both']) {
    let threw = false
    try { opp(bad) } catch { threw = true }
    assert(threw, `⑤ opp(${JSON.stringify(bad)}) 必须抛错 —— 返回 undefined 会一路飘到 state[undefined]，报错离现场很远`)
    assert(!isSide(bad), `⑤ isSide(${JSON.stringify(bad)}) === false`)
  }
  // rules.js 的入参守卫
  for (const fn of [
    () => canPlayCard(freshState({ phase: 'main' }), 'nobody', CHEETAH, 0),
    () => canAttackFrom(freshState({ phase: 'battle' }), 'nobody', 0, {}),
    () => canTargetSlot(freshState({ phase: 'battle' }), 'nobody', CHEETAH, -1),
  ]) {
    let threw = false
    try { fn() } catch { threw = true }
    assert(threw, '⑤ rules.js 的导出必须在非法 side 上抛错，不得静默走某一侧')
  }
}

// ---- 汇总 ----
if (fails.length) {
  console.error(`❌ test-rules-gates: ${fails.length} 条失败`)
  for (const f of fails) console.error('   · ' + f)
  process.exit(1)
}
console.log(`✅ test-rules-gates: ${pass} 条断言通过`)
