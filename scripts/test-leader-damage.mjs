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
  // ⚠️ 这条断言本身是对的（纯函数给了 partialAwaken 就该算 ×1.3），但**别据此以为
  //    游戏里打得出 ×1.3**：引擎从不产生这一档 —— answerQuiz 是二元判定，题库也没有
  //    「哪些选项算接近」的标注，全项目零处写 partialAwaken:true。这里测的是一个
  //    「有能力、无来源」的档位。要激活它是内容工作（805 道题标 near-miss），未排期。
  eq(calcLeaderDamage(c, { partialAwaken: true }), 6500, '① 部分觉醒 ×1.3（能力存在，但引擎从不产生此档）')
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

// ---- ⑥ friendlyField 已接线（2026-07-24 根因修复）----
// 曾经 useBattle 的两个 triggerSkills('onAttack') 调用点都不传 friendlyField，
// conditionalAtk 的 per_ally 分支(skillTemplates.js)读它 → 虎鲸「协同猎杀」/神经元「突触传递」/
// 蜜蜂「蜂毒尾刺」自伤 三技能 100% 失效。现已补上（两处）。
// 本段守「直攻主人」这条 per_ally 也触发的路径 + 生产调用点接线；三技能完整功能测试见 test-onattack-friendly-field.mjs。
{
  const orca = byName('虎鲸·深海霸主')
  assert(orca, '⑥ 找得到虎鲸·深海霸主')
  if (orca) {
    const o = mk(orca, 'o')
    // per_ally 是唯一直攻主人也触发的 onAttack 加伤（skillTemplates.js 的 leader 例外）。无自然系友方 → 不触发（负例）。
    eq(triggerSkills('onAttack', leaderCtx(o)).length, 0,
      '⑥ 虎鲸「协同猎杀」无友方时不触发（allies=0 → null）')
    // 2 个自然系友方（直攻主人也吃加成）→ 倍率 (8500+1500×2)/8500。
    const nat = (uid) => ({ atk: 1000, hp: 1000, faction: 'nature', uid, currentHp: 1000, maxHp: 1000 })
    const ctxAllies = { attacker: o, target: 'leader', damageMultiplier: 1, friendlyField: [o, nat('a1'), nat('a2')] }
    const mult2 = aggregateCombatMods(triggerSkills('onAttack', ctxAllies)).damageMultiplier
    eq(mult2, (8500 + 1500 * 2) / 8500, '⑥ 虎鲸 + 2 自然系友方 → 倍率 (8500+3000)/8500')
    eq(calcLeaderDamage(o, { awakened: true, damageMultiplier: mult2 }), 23000,
      '⑥ 觉醒 + 2 友方直攻主人 = (8500+3000)×2 = 23000（< 30000，尚不秒杀）')
    // ⚠️ 平衡：满自然场(虎鲸 + 5 友方) (8500+7500)×2(觉醒) = 32000 ≥ 30000 → 觉醒可秒主人。
    //   用户已裁定「现值 +1500 上线、和齐齐试玩再调」（2026-07-24）→ 此处只留提醒、不做数值断言。
  }

  // 生产调用点接线哨兵（源码级）：两个 onAttack 调用点都必须传 friendlyField。
  // 曾断言「一个都没传(===0)」—— 修复后翻成「两个都传(===2)」。谁删了 friendlyField 这条会红。
  const src = readFileSync(join(root, 'src/hooks/useBattle.js'), 'utf8')
  const onAttackCalls = [...src.matchAll(/triggerSkills\('onAttack',\s*\{[\s\S]*?\n\s*\}\)/g)].map((m) => m[0])
  eq(onAttackCalls.length, 2, '⑥ useBattle 应有 2 个 onAttack 调用点（1 直攻主人 + 1 打卡；S5 de-fork 后玩家/AI 共用）')
  eq(onAttackCalls.filter((c) => c.includes('friendlyField')).length, 2,
    '⑥ 两个 onAttack 调用点都必须传 friendlyField（协同猎杀/突触传递/蜂毒自伤 的根因修复）')
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
  // S5 de-fork：玩家与 AI 的直攻主人分支已合并 → 2 → **1**。
  // 不变式没变（倍率必须读事件声明的 mods，不能认 type 硬乘 2），但从「两条分支都得记着写」
  // 变成了**结构保证**。这正是 CLAUDE.md「改战斗规则须两处同步改」那条规矩被删掉的样子
  // —— 而那条规矩本身就是这个 fork 的伤疤。
  eq(leaderBranches, 1, '⑤ 直攻主人分支必须用 aggregateCombatMods(atkEvents)（S5 de-fork 后仅 1 条，两侧共用）')
}

// ---- 汇总 ----
if (fails.length) {
  console.error(`❌ test-leader-damage: ${fails.length} 条失败`)
  for (const f of fails) console.error('   · ' + f)
  process.exit(1)
}
console.log(`✅ test-leader-damage: ${pass} 条断言通过`)
