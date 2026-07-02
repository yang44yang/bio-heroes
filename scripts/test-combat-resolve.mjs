// test-combat-resolve.mjs — 首个「真正驱动战斗结算」的单测（import 纯引擎，非正则匹配源码）。
// 覆盖 src/engine/combat.js 的 resolveCardCombat：互扣 / 护盾 / 免疫 / 阵营克制 / 觉醒。
import { resolveCardCombat } from '../src/engine/combat.js'
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

// ---- 汇总 ----
if (fails.length) {
  console.error(`❌ test-combat-resolve: ${pass} 通过, ${fails.length} 失败`)
  for (const f of fails) console.error('   ✗ ' + f)
  process.exit(1)
}
console.log(`✅ test-combat-resolve: ${pass} 断言全通过`)
