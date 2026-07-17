// test-hand-uid.mjs — 手牌 uid 必须能区分双方的漂移守卫。
//
// 为什么有这个文件（2026-07-17）：
//   useHand 过去铸 uid 是 `${c.id}_${i}`（卡 id + 卡组下标），**不带方前缀**。
//   而 BattleScreen 跑两个 useHand 实例（player/enemy），引擎里 summonedThisTurn /
//   attackedThisTurn 是**双方共用的一个 Set**（useBattle.js:42-43），
//   combat.js:124-125 的 canCardAttack 纯按 card.uid 查表、不带 side 参数。
//   于是：两副卡组只要在同一下标上放了同一张卡，双方那两张卡的 uid 就是同一个字符串
//   → 一方召唤，另一方那张立刻被误判「召唤疲劳」；一方攻击，另一方那张被误判「已攻击」。
//
//   这是**已经存在于 PvE 的真 bug**，不是 PvP 才有的。它至今没被发现，只因为预设的
//   PvE 测试卡组恰好没有「同卡同下标」。PvP 的公平模式（双方全卡池自由组卡、两个小孩
//   大概率互抄卡表）会把这个巧合彻底打破 —— 卡组高度重合会从边缘情况变成默认情况。
//
//   证据表明这是疏漏而非取舍：SP 卡组的 uid 从一开始就带方前缀
//   （useBattle.js:1556-1557 的 `sp_p_${id}_${i}` / `sp_e_${id}_${i}`）。同一个作者、
//   同一个文件、同一类问题 —— 手牌这条路只是漏了。
//
//   同类前科：makeFieldCard 不发 uid → `attackedThisTurn.has(undefined)` 全场命中
//   → 一张卡攻击=全场锁死（事故剖析留在 useBattle.js:207-216 的 14 行注释里）。
//   同一个 Set、同一类 uid 塌缩，第二次。
//
// 覆盖策略：**驱动真的 canCardAttack**，不做源码正则匹配。
//   ① mintHandUid 的方隔离契约（含 side 必填）
//   ② 用真引擎复现 bug：旧 uid 方案 → 串台；新方案 → 不串台
//   ③ 前缀不能反过来制造新碰撞（player_/enemy_ 不得与其他产地的 uid 撞）
//
// 前提：src/hooks/*.js 的相对 import 已补 .js（commit 6cffff1）—— 否则这个文件
// import 不进 useHand，只能退化成正则匹配源码文本，而那是假绿的温床。

import { mintHandUid } from '../src/hooks/useHand.js'
import { canCardAttack } from '../src/engine/combat.js'

let pass = 0
const fails = []
const assert = (cond, msg) => { if (cond) pass++; else fails.push(msg) }
const eq = (actual, expected, msg) =>
  assert(actual === expected, `${msg} — 期望 ${JSON.stringify(expected)}, 实得 ${JSON.stringify(actual)}`)

// ---- ① mintHandUid 的契约 ----
{
  eq(mintHandUid('whale', 3, 'player'), 'player_whale_3', '① player 前缀')
  eq(mintHandUid('whale', 3, 'enemy'), 'enemy_whale_3', '① enemy 前缀')

  // 核心不变式：同卡 + 同下标 + 不同方 → uid 必须不同。这一条就是整个文件的存在理由。
  assert(
    mintHandUid('whale', 3, 'player') !== mintHandUid('whale', 3, 'enemy'),
    '① 同卡同下标、不同方 → uid 必须不同（这是本文件的核心不变式）'
  )

  // 同方内仍靠下标区分同名卡（同一张卡最多 3 张，是 CLAUDE.md 明确允许的）
  assert(
    mintHandUid('ant', 0, 'player') !== mintHandUid('ant', 1, 'player'),
    '① 同方同名卡靠下标区分'
  )

  // side 必填：漏传必须响，不能默默退回无前缀（那正是 bug 的原状）
  for (const bad of [undefined, null, '', 'Player', 'host', 0]) {
    let threw = false
    try { mintHandUid('whale', 0, bad) } catch { threw = true }
    assert(threw, `① side=${JSON.stringify(bad)} 必须抛错，不得静默生成无前缀 uid`)
  }
}

// ---- ② 用真的 canCardAttack 复现 bug ----
// 场景：双方卡组下标 3 都是蓝鲸。player 召唤了自己的蓝鲸（进 summonedThisTurn），
// 此刻 enemy 的蓝鲸**没有**被召唤，它必须仍可攻击。
{
  const mkCard = (id, idx, side) => ({
    id, name: id, uid: mintHandUid(id, idx, side), skills: [], statuses: [],
  })

  // --- 旧方案复现（故意重建 bug 前的铸造逻辑，证明这个测试真能抓到它）---
  const legacyUid = (id, idx) => `${id}_${idx}`
  {
    const summonedThisTurn = new Set([legacyUid('whale', 3)])   // player 召唤了蓝鲸
    const enemyWhale = { id: 'whale', uid: legacyUid('whale', 3), skills: [], statuses: [] }
    const gate = canCardAttack(enemyWhale, { summonedThisTurn, attackedThisTurn: new Set() })
    eq(gate.reason, 'fatigue',
      '② 旧 uid 方案下，敌方蓝鲸被 player 的召唤误判为疲劳 —— 这就是被修掉的 bug（此断言反向证明本测试有效）')
  }

  // --- 新方案：同样场景，不得串台 ---
  {
    const summonedThisTurn = new Set([mintHandUid('whale', 3, 'player')])
    const enemyWhale = mkCard('whale', 3, 'enemy')
    const gate = canCardAttack(enemyWhale, { summonedThisTurn, attackedThisTurn: new Set() })
    assert(gate.ok === true && gate.reason === null,
      `② 新 uid 方案：player 召唤蓝鲸不得让 enemy 的蓝鲸疲劳 —— 实得 ${JSON.stringify(gate)}`)
  }

  // --- attackedThisTurn 同理（另一个共用 Set）---
  {
    const attackedThisTurn = new Set([mintHandUid('tcell', 0, 'player')])
    const enemyTcell = mkCard('tcell', 0, 'enemy')
    const gate = canCardAttack(enemyTcell, { summonedThisTurn: new Set(), attackedThisTurn })
    assert(gate.ok === true,
      `② player 的 T细胞攻击过，不得让 enemy 的 T细胞被判「已攻击」—— 实得 ${JSON.stringify(gate)}`)
  }

  // --- 正向：自己方的疲劳判定必须仍然生效（别把 bug 修成「谁都不疲劳」）---
  {
    const summonedThisTurn = new Set([mintHandUid('whale', 3, 'player')])
    const ownWhale = mkCard('whale', 3, 'player')
    const gate = canCardAttack(ownWhale, { summonedThisTurn, attackedThisTurn: new Set() })
    eq(gate.reason, 'fatigue', '② 己方刚召唤的卡仍必须判疲劳（反向回归：别修成谁都不疲劳）')
  }
}

// ---- ③ 前缀不得与其它 uid 产地互撞 ----
// uid 的产地不止 useHand：SP 卡组 sp_p_/sp_e_（useBattle.js:1556-1557）、
// 上场兜底 fc_（:217）、奖励卡 bonus_、Boss 预置 boss_、教学 tut_、
// 技能召唤/复活/分裂（skillTemplates / skillRegistry / bossMechanics / stageRules）。
// 新前缀必须不与它们产生新的碰撞面。
{
  const handUids = ['whale', 'ant', 'tcell'].flatMap(id =>
    [0, 1, 2].flatMap(i => [mintHandUid(id, i, 'player'), mintHandUid(id, i, 'enemy')])
  )
  const foreign = [
    'sp_p_whale_0', 'sp_e_whale_0',      // SP 卡组
    'fc_whale_1',                         // makeFieldCard 兜底
    'boss_covid_0',                       // Boss 预置
    'bonus_player_whale_0_1750000000_0',  // 奖励卡（自身已带 side）
    'tut_whale_ab12',                     // 教学
  ]
  for (const f of foreign) {
    assert(!handUids.includes(f), `③ 手牌 uid 不得与其它产地撞：${f}`)
  }
  assert(new Set(handUids).size === handUids.length, '③ 手牌 uid 自身两两不重复')
}

// ---- 汇总 ----
if (fails.length) {
  console.error(`❌ test-hand-uid: ${fails.length} 条失败`)
  for (const f of fails) console.error('   · ' + f)
  process.exit(1)
}
console.log(`✅ test-hand-uid: ${pass} 条断言通过`)
