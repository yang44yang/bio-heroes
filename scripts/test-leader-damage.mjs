// test-leader-damage.mjs — 「直攻主人」伤害倍率的漂移守卫。
//
// 为什么有这个文件（2026-07-17）：
//   useBattle 的直攻主人分支曾经写成 `if (evt.type === 'RUSH_BOOST') dmgOpts.damageMultiplier *= 2`
//   —— 只认事件 type、从不读事件自己声明的 mods.damageMultiplier。RUSH_BOOST 是个被复用的
//   事件 type（无视守护 / 无视护盾 / 加伤都用它），拿 type 当"要翻倍"的信号从一开始就是错的。
//   实测三张卡受害（真实 ctx 下全卡池就这三张能在直攻主人时拿到倍率）：
//     · 手术刀·精准之刃 Precision Excision 只是「无视守护」、事件没有 mods → 白拿 ×2（11000→5500）
//     · 猎豹·闪电猎手 Hyperspeed Dash    卡面「首次攻击 ×1.5」→ 实际 ×2（10000→7500）
//     · 猫头鹰·暗夜猎手 Silent Dive      同上（10000→7500）
//   43 套测试全绿却没人抓到，因为直攻主人的倍率路径当时零覆盖。
//
// ⚠️ 写测试时务必用「与 useBattle.js:1820 逐字一致的 ctx」驱动：{ attacker, target:'leader', damageMultiplier:1 }。
//   本文件初版给 ③ 传了 friendlyField，而生产的四个 triggerSkills('onAttack') 调用点一个都不传 —— 结果是
//   凭空造出一条「虎鲸协同猎杀 ×2 叠觉醒 = 34000 秒杀主人」的假 bug，断言还永远绿。测试必须照着生产的
//   ctx 写，否则守的是一条游戏里永不发生的路径（假绿比没测试更危险）。
//   虎鲸真正的问题见 ⑥：缺 friendlyField 导致「协同猎杀」100% 失效 —— 那是另一个待修的真 bug。
//
// 覆盖策略（与 test-combat-resolve 同款「import 真引擎」而非正则匹配源码）：
//   ① calcLeaderDamage 的觉醒×倍率组合语义
//   ② aggregateCombatMods 必须忽略无 mods 的事件（手术刀那一类）
//   ③ 驱动真实 skillRegistry + 真实 cards.js + 真实 ctx：声明的倍率必须与卡面描述一致
//   ④ 'Rush' 必须用 mods 声明倍率（反向回归：调用方现在只读 mods）
//   ⑤ useBattle.js 源码守卫：两条直攻主人分支不得再出现硬编码 ×2
//   ⑥ friendlyField 缺失的现状快照 —— 修好那个 bug 时这条会红，提醒回来更新此处

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { aggregateCombatMods } from '../src/engine/combat.js'
import { calcLeaderDamage } from '../src/utils/damage.js'
import { triggerSkills } from '../src/engine/skillTriggers.js'
import CARDS from '../src/data/cards.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

let pass = 0
const fails = []
const assert = (cond, msg) => { if (cond) pass++; else fails.push(msg) }
const eq = (actual, expected, msg) =>
  assert(actual === expected, `${msg} — 期望 ${expected}, 实得 ${actual}`)

const LEADER_HP = 30000 // 主人满血（deckRules 的 LEADER_HP 语义，用于秒杀判定）
const byName = (n) => CARDS.find((c) => c.name === n)

// ---- ① calcLeaderDamage 的组合语义 ----
// 觉醒(getEffectiveAtk 的 ×2)与技能倍率(damageMultiplier)是两个正交维度、相乘不双算。
{
  const c = { atk: 5000 }
  eq(calcLeaderDamage(c, {}), 5000, '① 无觉醒无倍率 = 原始 ATK')
  eq(calcLeaderDamage(c, { awakened: true }), 10000, '① 觉醒 ×2')
  eq(calcLeaderDamage(c, { damageMultiplier: 1.5 }), 7500, '① 纯倍率 ×1.5')
  eq(calcLeaderDamage(c, { awakened: true, damageMultiplier: 1.5 }), 15000, '① 觉醒与倍率相乘 = ×3')
  eq(calcLeaderDamage(c, { partialAwaken: true }), 6500, '① 部分觉醒 ×1.3')
  // 科学家模式(BattleScreen 的 ×1.2)也走 damageMultiplier，与技能倍率合成：
  eq(calcLeaderDamage(c, { awakened: true, damageMultiplier: 1.2 * 1.5 }), 18000,
    '① 觉醒×2 × 科学家×1.2 × 冲刺×1.5 = 18000')
  // 两个 ×2 相乘就是 ×4 —— 这正是「给声明 1.5 的技能发 ×2」会放大成什么样：
  eq(calcLeaderDamage(c, { awakened: true, damageMultiplier: 2 }), 20000,
    '① 若错发 ×2：觉醒×2 × 2 = ×4，比卡面(×3=15000)高出整整 5000')
  assert(LEADER_HP === 30000, '① 主人满血基准仍是 30000（变了要回来重算上面几条的意义）')
}

// ---- ② aggregateCombatMods 必须忽略无 mods 的事件 ----
{
  // 手术刀「精准切除」正是这一类：有 type、无 mods → 不该产生任何加成
  eq(aggregateCombatMods([{ type: 'RUSH_BOOST', message: 'x' }]).damageMultiplier, 1,
    '② 无 mods 的 RUSH_BOOST 不产生倍率（手术刀不该白拿 ×2）')
  eq(aggregateCombatMods([{ type: 'RUSH_BOOST', mods: { damageMultiplier: 1.5 } }]).damageMultiplier, 1.5,
    '② 声明 1.5 就是 1.5，不是 2（猎豹卡面一致性）')
  eq(aggregateCombatMods([]).damageMultiplier, 1, '② 空事件列表 = 无加成')
  eq(aggregateCombatMods([
    { type: 'RUSH_BOOST', mods: { damageMultiplier: 2 } },
    { type: 'RUSH_BOOST', mods: { damageMultiplier: 1.5 } },
  ]).damageMultiplier, 3, '② 多个倍率相乘')
  // 无视守护是攻击前的门（guardSkill），不是伤害倍率 —— 不得混进 damageMultiplier
  eq(aggregateCombatMods([{ type: 'RUSH_BOOST', mods: { ignoreShield: true } }]).damageMultiplier, 1,
    '② 只声明 ignoreShield 的事件不产生倍率')
}

// ---- ③ 真实技能 × 真实卡 × 真实 ctx：直攻主人时声明的倍率必须与卡面一致 ----
// leaderCtx 必须与 useBattle.js:1820 / :2058 逐字一致 —— 多传一个字段就会测到生产不可达的路径。
const leaderCtx = (c) => ({ attacker: c, target: 'leader', damageMultiplier: 1 })
const mk = (c, uid) => ({ ...c, uid, currentHp: c.hp, maxHp: c.hp })
const multOf = (c) => aggregateCombatMods(triggerSkills('onAttack', leaderCtx(c))).damageMultiplier
{
  // 卡面写 ×1.5 的两张（初版只找到猎豹，漏了猫头鹰 —— 靠全卡池穷举才补上）
  for (const name of ['猎豹·闪电猎手', '猫头鹰·暗夜猎手']) {
    const c = byName(name)
    assert(c, `③ 找得到 ${name}`)
    if (!c) continue
    eq(multOf(mk(c, 'u')), 1.5, `③ ${name} 卡面「首次攻击 ×1.5」→ 倍率就得是 1.5，不是 2`)
    eq(calcLeaderDamage(mk(c, 'u2'), { damageMultiplier: multOf(mk(c, 'u3')) }), Math.floor(c.atk * 1.5),
      `③ ${name} 直攻主人 = ${c.atk}×1.5`)
  }

  // 手术刀·精准之刃 —— 「精准切除」只该无视守护，不该有任何伤害加成
  const scalpel = byName('手术刀·精准之刃')
  assert(scalpel, '③ 找得到手术刀·精准之刃')
  if (scalpel) {
    eq(multOf(mk(scalpel, 's')), 1, '③ 手术刀「精准切除」是无视守护、不是加伤 → 无倍率')
    eq(calcLeaderDamage(mk(scalpel, 's2'), { damageMultiplier: multOf(mk(scalpel, 's3')) }), scalpel.atk,
      `③ 手术刀直攻主人 = 原始 ${scalpel.atk}（旧代码白送成 ${scalpel.atk * 2}）`)
  }

  // 穷举：真实 ctx 下全卡池只有上面 3 张能在直攻主人时拿到倍率。
  // 多出一张 = 有人加了新技能却没想过直攻主人；少一张 = 某张的技能悄悄失效了。
  const withMult = CARDS.filter((c) => c.atk && c.skills?.length && multOf(mk(c, 'p')) !== 1).map((c) => c.name)
  eq(withMult.sort().join(','), ['猎豹·闪电猎手', '猫头鹰·暗夜猎手'].sort().join(','),
    '③ 真实 ctx 下能拿到直攻主人倍率的卡，全卡池只有猎豹与猫头鹰')
}

// ---- ⑥ friendlyField 缺失的现状快照（这是个真 bug，不是设计）----
// useBattle 的四个 triggerSkills('onAttack') 调用点都不传 friendlyField，
// 而 conditionalAtk 的 per_ally 分支(skillTemplates.js)读它 → 下面两张卡的招牌技能 100% 失效。
// ⚠️ 修好那个 bug 时这两条会红 —— 那时请回来把断言改成期望的真实数值，别直接删。
{
  const orca = byName('虎鲸·深海霸主')
  assert(orca, '⑥ 找得到虎鲸·深海霸主')
  if (orca) {
    eq(triggerSkills('onAttack', leaderCtx(mk(orca, 'o'))).length, 0,
      '⑥ 虎鲸「协同猎杀」当前零触发（缺 friendlyField）—— 8500 SSR 的招牌技能是死的，待修')
    eq(calcLeaderDamage(mk(orca, 'o2'), { awakened: true, damageMultiplier: multOf(mk(orca, 'o3')) }), 17000,
      '⑥ 故其觉醒直攻主人 = 17000 < 30000，不存在"满血秒杀"（本文件初版曾误信 34000）')
  }
  const neuron = byName('神经元·闪电信使')
  if (neuron) {
    eq(triggerSkills('onAttack', leaderCtx(mk(neuron, 'n'))).length, 0,
      '⑥ 神经元「突触传递」同样零触发（缺 friendlyField）—— 同根因，待修')
  }

  // 上面两条用的是本文件自己的 ctx，改 useBattle 不会让它们变红 —— 真正的哨兵在这：
  // 直接盯生产的调用点。有人补上 friendlyField 时这条会红，把他引到这段说明。
  const src = readFileSync(join(root, 'src/hooks/useBattle.js'), 'utf8')
  const onAttackCalls = [...src.matchAll(/triggerSkills\('onAttack',\s*\{[\s\S]*?\n\s*\}\)/g)].map((m) => m[0])
  eq(onAttackCalls.length, 4, '⑥ useBattle 应有 4 个 onAttack 调用点（2 直攻主人 + 2 打卡）')
  eq(onAttackCalls.filter((c) => c.includes('friendlyField')).length, 0,
    '⑥ 现状快照：没有任何 onAttack 调用点传 friendlyField —— 若你刚补上，请回来更新 ⑥，' +
    '并同时评估平衡：虎鲸满场 5 个自然系友方时 (8500+7500)×2(觉醒) = 32000 ≥ 主人 30000（6 格后才够得着，5 格时是 29000）')
}

// ---- ④ 每个「能在直攻主人时触发」的技能都必须声明 mods（否则静默变哑弹）----
// 这条守的是反向回归：调用方现在只读 mods，任何靠 mutate ctx 传倍率的 handler 都会失效。
{
  const regSrc = readFileSync(join(root, 'src/engine/skillRegistry.js'), 'utf8')
  // 'Rush' 是 CLAUDE.md 记载的通用技能「突进：直攻主人时伤害翻倍」。
  // 它曾经只改 ctx.damageMultiplier（被 triggerSkills 的 {...context} 拷贝丢弃）且返回事件不带 mods。
  const rushBlock = regSrc.slice(regSrc.indexOf("'Rush': {"), regSrc.indexOf("'Natural Recovery'"))
  assert(/mods:\s*\{[^}]*damageMultiplier:\s*2/.test(rushBlock),
    "④ 'Rush' 必须用 mods.damageMultiplier=2 声明翻倍（改 ctx 会被拷贝丢弃 → 哑弹）")
  assert(!/ctx\.damageMultiplier\s*=/.test(rushBlock),
    "④ 'Rush' 不得再靠 mutate ctx 传倍率")
}

// ---- ⑤ useBattle 源码守卫：两条直攻主人分支不得硬编码 ×2 ----
{
  const src = readFileSync(join(root, 'src/hooks/useBattle.js'), 'utf8')
  const bad = /evt\.type\s*===\s*'RUSH_BOOST'\s*\)\s*dmgOpts\.damageMultiplier\s*=/g
  const hits = src.match(bad) || []
  eq(hits.length, 0,
    '⑤ 直攻主人不得再出现 `evt.type===RUSH_BOOST → dmgOpts.damageMultiplier=` 硬编码（必须走 aggregateCombatMods）')

  // 正向：两条分支（玩家 + AI）都必须真的调用 aggregateCombatMods
  const leaderBranches = (src.match(/aggregateCombatMods\(atkEvents\)/g) || []).length
  eq(leaderBranches, 2, '⑤ 玩家与 AI 两条直攻主人分支都要用 aggregateCombatMods(atkEvents)')
}

// ---- 汇总 ----
if (fails.length) {
  console.error(`❌ test-leader-damage: ${fails.length} 条失败`)
  for (const f of fails) console.error('   · ' + f)
  process.exit(1)
}
console.log(`✅ test-leader-damage: ${pass} 条断言通过`)
