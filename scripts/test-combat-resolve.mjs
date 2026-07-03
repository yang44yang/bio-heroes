// test-combat-resolve.mjs — 首个「真正驱动战斗结算」的单测（import 纯引擎，非正则匹配源码）。
// 覆盖 src/engine/combat.js 的 resolveCardCombat：互扣 / 护盾 / 免疫 / 阵营克制 / 觉醒。
import { resolveCardCombat, aggregateCombatMods, canCardAttack } from '../src/engine/combat.js'
import { onHitCounter } from '../src/engine/skillTemplates.js'
import { FACTION_ADVANTAGE, FACTION_ADVANTAGE_BONUS } from '../src/data/deckRules.js'

let pass = 0
const fails = []
function assert(cond, msg) {
  if (cond) pass++
  else fails.push(msg)
}
function eq(actual, expected, msg) {
  assert(actual === expected, `${msg} — 期望 ${expected}, 实得 ${actual}`)
}

const card = (o) => ({ atk: 0, currentHp: 9999, maxHp: 9999, faction: 'nature', statuses: [], ...o })

// 找一对有克制关系的阵营（不硬编码名字，随数据走）
const atkFac = Object.keys(FACTION_ADVANTAGE).find((f) => FACTION_ADVANTAGE[f]?.strong)
const defFac = FACTION_ADVANTAGE[atkFac].strong
// 找一个「互不克制」的同类对照阵营：用 defFac 当攻击方、atkFac 当防守方时，只要 defFac 不克制 atkFac 即可
const neutralA = FACTION_ADVANTAGE[defFac]?.strong === atkFac ? null : defFac

// ---- 1. 基础互扣（无克制、无护盾）----
{
  const r = resolveCardCombat({
    attacker: card({ atk: 3000, faction: neutralA || atkFac }),
    defender: card({ atk: 2000, faction: neutralA || atkFac }),
  })
  eq(r.atkDmg, 3000, '① 基础 atkDmg')
  eq(r.defDmg, 2000, '① 基础 defDmg（反击不吃克制）')
  eq(r.defActualDmg, 3000, '① 无护盾时 defActualDmg==atkDmg')
  eq(r.atkActualDmg, 2000, '① 无护盾时 atkActualDmg==defDmg')
  eq(r.defShieldAbsorbed, 0, '① 无护盾吸收=0')
  eq(r.defImmune, false, '① 非免疫')
  eq(r.atkFactionBonus, false, '① 同/中立阵营无克制加成')
}

// ---- 2. 护盾部分吸收 ----
{
  const r = resolveCardCombat({
    attacker: card({ atk: 3000, faction: neutralA || atkFac }),
    defender: card({ atk: 1000, faction: neutralA || atkFac, statuses: [{ type: 'shield', amount: 1200 }] }),
  })
  eq(r.atkDmg, 3000, '② 原始 atkDmg 不受护盾影响')
  eq(r.defShieldAbsorbed, 1200, '② 护盾吸收 1200')
  eq(r.defActualDmg, 1800, '② 实际扣血 3000-1200=1800')
}

// ---- 3. 护盾完全吸收 ----
{
  const r = resolveCardCombat({
    attacker: card({ atk: 2500, faction: neutralA || atkFac }),
    defender: card({ atk: 1000, faction: neutralA || atkFac, statuses: [{ type: 'shield', amount: 9000 }] }),
  })
  eq(r.defShieldAbsorbed, 2500, '③ 大护盾吸收=全部伤害')
  eq(r.defActualDmg, 0, '③ 完全吸收后扣血 0')
}

// ---- 4. 防守方免疫 ----
{
  const r = resolveCardCombat({
    attacker: card({ atk: 3000, faction: neutralA || atkFac }),
    defender: card({ atk: 2000, faction: neutralA || atkFac, statuses: [{ type: 'immune' }] }),
  })
  eq(r.defImmune, true, '④ 免疫标志 true')
  eq(r.atkDmg, 0, '④ 免疫→atkDmg 0')
  eq(r.defActualDmg, 0, '④ 免疫→实际扣血 0')
}

// ---- 5. 阵营克制加成（+20%）----
{
  const r = resolveCardCombat({
    attacker: card({ atk: 3000, faction: atkFac }),
    defender: card({ atk: 1000, faction: defFac }),
  })
  const expected = Math.floor(3000 * (1 + FACTION_ADVANTAGE_BONUS))
  eq(r.atkFactionBonus, true, `⑤ ${atkFac} 克制 ${defFac} → 加成标志`)
  eq(r.atkDmg, expected, `⑤ 克制伤害 = floor(3000×${1 + FACTION_ADVANTAGE_BONUS})`)
}

// ---- 6. 觉醒（ATK ×2 流经结算）----
{
  const base = resolveCardCombat({
    attacker: card({ atk: 2500, faction: neutralA || atkFac }),
    defender: card({ atk: 1000, faction: neutralA || atkFac }),
  })
  const awk = resolveCardCombat({
    attacker: card({ atk: 2500, faction: neutralA || atkFac }),
    defender: card({ atk: 1000, faction: neutralA || atkFac }),
    awakenOpts: { awakened: true },
  })
  eq(base.atkDmg, 2500, '⑥ 未觉醒 atkDmg 2500')
  eq(awk.atkDmg, 5000, '⑥ 觉醒 atkDmg ×2 = 5000')
  eq(awk.defDmg, 1000, '⑥ 觉醒不影响反击伤害')
}

const nf = neutralA || atkFac // 中立阵营（无克制），用于隔离修饰符测试

// ---- 7. aggregateCombatMods: 折叠事件里的 mods ----
{
  const agg = aggregateCombatMods([
    { type: 'RUSH_BOOST', mods: { damageMultiplier: 2 } },
    { type: 'RUSH_BOOST', mods: { damageMultiplier: 1.5 } },
    { type: 'RUSH_BOOST', mods: { ignoreShield: true } },
    { type: 'AOE_DAMAGE', damage: 100 }, // 无 mods → 忽略
    { type: 'RUSH_BOOST', mods: { damageReduction: 500 } },
    { type: 'RUSH_BOOST', mods: { damageReduction: 300 } },
    { type: 'RUSH_BOOST', mods: { dodged: true } },
  ])
  eq(agg.damageMultiplier, 3, '⑦ 倍率相乘 2×1.5=3')
  eq(agg.ignoreShield, true, '⑦ ignoreShield 取或')
  eq(agg.damageReduction, 800, '⑦ 减伤相加 500+300')
  eq(agg.dodged, true, '⑦ dodged 取或')
  const empty = aggregateCombatMods([])
  eq(empty.damageMultiplier, 1, '⑦ 空事件→倍率默认 1')
  eq(empty.damageReduction, 0, '⑦ 空事件→减伤默认 0')
}

// ---- 8. mods 消费: 克制加倍（P0 核心）----
{
  const base = resolveCardCombat({ attacker: card({ atk: 3000, faction: nf }), defender: card({ atk: 1000, faction: nf }) })
  const x2 = resolveCardCombat({ attacker: card({ atk: 3000, faction: nf }), defender: card({ atk: 1000, faction: nf }), mods: { damageMultiplier: 2 } })
  eq(base.atkDmg, 3000, '⑧ 无 mods 基线 3000')
  eq(x2.atkDmg, 6000, '⑧ ×2 倍率 → 6000（打卡终于生效）')
}

// ---- 9. mods 消费: 无视护盾（P0 核心：Spike Protein）----
{
  const normal = resolveCardCombat({ attacker: card({ atk: 3000, faction: nf }), defender: card({ atk: 1000, faction: nf, statuses: [{ type: 'shield', amount: 2000 }] }) })
  const pierce = resolveCardCombat({ attacker: card({ atk: 3000, faction: nf }), defender: card({ atk: 1000, faction: nf, statuses: [{ type: 'shield', amount: 2000 }] }), mods: { ignoreShield: true } })
  eq(normal.defActualDmg, 1000, '⑨ 普通：3000-2000护盾=1000')
  eq(normal.defShieldAbsorbed, 2000, '⑨ 普通吸收 2000')
  eq(pierce.defActualDmg, 3000, '⑨ 无视护盾：全额 3000 穿透')
  eq(pierce.defShieldAbsorbed, 0, '⑨ 无视护盾：吸收 0')
}

// ---- 10. mods 消费: 闪避 → 0 伤害（Pseudopod Morph）----
{
  const r = resolveCardCombat({ attacker: card({ atk: 5000, faction: nf }), defender: card({ atk: 1000, faction: nf }), mods: { dodged: true } })
  eq(r.atkDmg, 0, '⑩ 闪避 → 攻击伤害 0')
  eq(r.defActualDmg, 0, '⑩ 闪避 → 实际扣血 0')
  eq(r.defDmg, 1000, '⑩ 闪避不影响防守方反击')
}

// ---- 11. mods 消费: 减伤 & 完全免疫（Leaf Fold / MRSA 式）----
{
  const partial = resolveCardCombat({ attacker: card({ atk: 3000, faction: nf }), defender: card({ atk: 1000, faction: nf }), mods: { damageReduction: 1200 } })
  eq(partial.atkDmg, 1800, '⑪ 减伤 3000-1200=1800')
  const immune = resolveCardCombat({ attacker: card({ atk: 3000, faction: nf }), defender: card({ atk: 1000, faction: nf }), mods: { damageReduction: 3000 } })
  eq(immune.atkDmg, 0, '⑪ 减伤≥伤害 → 0（MRSA 完全免疫）')
}

// ---- 12. 倍率 + 护盾 顺序（先加倍再吸收）----
{
  const r = resolveCardCombat({ attacker: card({ atk: 2000, faction: nf }), defender: card({ atk: 1000, faction: nf, statuses: [{ type: 'shield', amount: 1000 }] }), mods: { damageMultiplier: 2 } })
  eq(r.atkDmg, 4000, '⑫ 先 ×2 → 4000')
  eq(r.defActualDmg, 3000, '⑫ 再扣 1000 护盾 → 3000')
}

// ---- 13. 无 mods 时行为与切片1完全一致（防回归）----
{
  const withUndef = resolveCardCombat({ attacker: card({ atk: 3000, faction: nf }), defender: card({ atk: 2000, faction: nf }) })
  const withEmpty = resolveCardCombat({ attacker: card({ atk: 3000, faction: nf }), defender: card({ atk: 2000, faction: nf }), mods: aggregateCombatMods([]) })
  eq(withUndef.atkDmg, 3000, '⑬ mods 缺省 atkDmg 不变')
  eq(withEmpty.atkDmg, 3000, '⑬ 空 mods atkDmg 不变')
  eq(withUndef.defActualDmg, 3000, '⑬ mods 缺省 defActualDmg 不变')
}

// ---- 14. 闭环：真实生产端（onHitCounter 模板）确实吐出 mods ----
{
  const red = onHitCounter({ defender: card({ atk: 1000 }), attacker: card({ atk: 2000 }) }, { effect: 'reduce_damage', amount: 800 })
  eq(red?.mods?.damageReduction, 800, '⑭ reduce_damage 生产端吐 mods.damageReduction=800')
  const dod = onHitCounter({ defender: card({ atk: 1000 }), attacker: card({ atk: 2000 }) }, { effect: 'dodge', chance: 1 })
  eq(dod?.mods?.dodged, true, '⑭ dodge(chance=1) 生产端吐 mods.dodged=true')
  // 端到端：把生产端事件喂给 aggregate，再喂给 resolve → 减伤真正生效
  const mods = aggregateCombatMods([red])
  const r = resolveCardCombat({ attacker: card({ atk: 3000, faction: nf }), defender: card({ atk: 1000, faction: nf }), mods })
  eq(r.atkDmg, 2200, '⑭ 生产端→聚合→结算 全链路：3000-800=2200')
}

// ---- 15. canCardAttack 能否攻击纯谓词（决策E2）----
{
  const c = (o) => ({ uid: 'u1', skills: [], statuses: [], ...o })
  const S = (uids) => new Set(uids)
  eq(canCardAttack(c(), { summonedThisTurn: S([]), attackedThisTurn: S([]) }).ok, true, '⑮ 干净卡可攻击')
  const sleep = canCardAttack(c({ statuses: [{ type: 'sleep' }] }), { summonedThisTurn: S([]), attackedThisTurn: S([]) })
  eq(sleep.ok, false, '⑮ 沉睡不可攻击'); eq(sleep.reason, 'sleep', '⑮ reason=sleep')
  eq(canCardAttack(c(), { summonedThisTurn: S(['u1']), attackedThisTurn: S([]) }).reason, 'fatigue', '⑮ 召唤疲劳 reason=fatigue')
  eq(canCardAttack(c({ skills: [{ nameEn: 'Swift Attack' }] }), { summonedThisTurn: S(['u1']) }).ok, true, '⑮ Swift Attack 免召唤疲劳')
  eq(canCardAttack(c({ skills: [{ nameEn: 'Silent Dive' }] }), { summonedThisTurn: S(['u1']) }).ok, true, '⑮ Silent Dive 免召唤疲劳')
  eq(canCardAttack(c({ statuses: [{ type: 'swift_boost' }] }), { summonedThisTurn: S(['u1']) }).ok, true, '⑮ swift_boost 免召唤疲劳')
  eq(canCardAttack(c(), { summonedThisTurn: S([]), attackedThisTurn: S(['u1']), checkAttacked: true }).reason, 'attacked', '⑮ 已攻击 reason=attacked')
  eq(canCardAttack(c(), { summonedThisTurn: S([]), attackedThisTurn: S(['u1']), checkAttacked: false }).ok, true, '⑮ AI(checkAttacked:false) 不查已攻击')
  eq(canCardAttack(c({ statuses: [{ type: 'sleep' }] }), { summonedThisTurn: S(['u1']), attackedThisTurn: S(['u1']) }).reason, 'sleep', '⑮ 优先级 sleep 最高')
  eq(canCardAttack(c(), { summonedThisTurn: S(['u1']), attackedThisTurn: S(['u1']) }).reason, 'fatigue', '⑮ 优先级 fatigue > attacked')
}

// ---- 汇总 ----
if (fails.length) {
  console.error(`❌ test-combat-resolve: ${pass} 通过, ${fails.length} 失败`)
  for (const f of fails) console.error('   ✗ ' + f)
  process.exit(1)
}
console.log(`✅ test-combat-resolve: ${pass} 断言全通过`)
