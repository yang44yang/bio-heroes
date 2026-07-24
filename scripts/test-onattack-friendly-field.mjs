#!/usr/bin/env node
// onAttack 技能读 friendlyField 的根因修复回归测试（2026-07-24）
//
// bug：useBattle 的两个 triggerSkills('onAttack') 调用点从不传 friendlyField，
//   → conditionalAtk 的 per_ally 分支(虎鲸「协同猎杀」) / onAttackDebuff 的 self_damage(蜜蜂「蜂毒尾刺」自伤) /
//     Synaptic Relay(神经元「突触传递」) 三技能 100% 失效（读到的恒是 []）。
// 修：两个调用点补 `friendlyField: battleStateRef.current[side].field`；
//   且蜜蜂自伤事件 _side 从 'friendly' 改 'attacker' —— AOE_DAMAGE 消费端只认 _side==='attacker' 为
//   "攻击者自己那方"(friendlySetter)，否则 500 自伤落到敌方（与 onHitCounter / Antibiotic Resistance 的路由修复同款）。
//
// 覆盖（与 test-counter-routing / test-leader-damage 同款「import 真引擎，不手搓 fixture」）：
//   ⓪ 直接 import 真模板 / 真 skillRegistry，喂被填充的 friendlyField，断言三技能的真实产物
//   ① 源码级接线哨兵：生产的两个 onAttack 调用点必须都传 friendlyField（漏一个 → 那条路径哑火）
//   ② 模板级哨兵：蜜蜂自伤 _side 必须是 'attacker'（防有人改回 'friendly' → 自伤落敌方）
// ☠️ 变异性：撤销 useBattle 两处补丁 → ① 红；撤销 skillTemplates 的 _side → ⓪蜜蜂/② 红。

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { conditionalAtk, onAttackDebuff } from '../src/engine/skillTemplates.js'
import { skillRegistry } from '../src/engine/skillRegistry.js'
import CARDS from '../src/data/cards.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }

const byName = (n) => CARDS.find((c) => c.name === n)
const mk = (c, uid) => ({ ...c, uid, currentHp: c.hp, maxHp: c.hp })
const ally = (faction, uid) => ({ atk: 1000, hp: 1000, faction, uid, currentHp: 1000, maxHp: 1000 })
const arr = (r) => (Array.isArray(r) ? r : r ? [r] : [])

// ============ ⓪ 功能：三技能在 friendlyField 被填充时的真实行为 ============

// 1) 蜜蜂「蜂毒尾刺」self_damage —— 自伤必须落"攻击者自己"(_side=attacker)、命中自己真实 slot
{
  const bee = { uid: 'bee1', name: '蜜蜂', atk: 2000, currentHp: 1500 }
  const def = { uid: 'def1', name: '敌人', currentHp: 3000, faction: 'body' }
  const field = [null, bee, null] // 蜜蜂在 slot 1
  const evs = arr(onAttackDebuff(
    { attacker: bee, defender: def, target: 'card', friendlyField: field },
    { effect: 'poison', amount: 500, duration: 1, self_damage: 500 },
  ))
  const self = evs.find((e) => e.type === 'AOE_DAMAGE')
  ok('⓪ 蜜蜂自伤发 AOE_DAMAGE 事件', !!self)
  ok('⓪ 蜜蜂自伤 _side==="attacker"（落攻击者自己那方，不是敌方）—— 修复核心', self && self._side === 'attacker')
  ok('⓪ 蜜蜂自伤 targetSlot=自己真实 slot(1)，不再是 -1', self && self.targetSlot === 1)
  ok('⓪ 蜜蜂自伤 damage=500 / 命中自己 uid', self && self.damage === 500 && self.targetUid === 'bee1')
  const poison = evs.find((e) => e.type === 'APPLY_POISON')
  ok('⓪ 蜜蜂中毒部分仍按 uid 命中敌方（回归：修自伤没碰它）',
    poison && poison.targetUid === 'def1' && poison.damage === 500)
}

// 2) 虎鲸「协同猎杀」per_ally —— 每个其他自然系友方 +1500，用 RUSH_BOOST 倍率表达
{
  const orca = byName('虎鲸·深海霸主')
  ok('⓪ 找得到虎鲸·深海霸主', !!orca)
  if (orca) {
    const o = mk(orca, 'orca1')
    const P = { condition: 'per_ally', ally_faction: 'nature', amount: 1500 }
    ok('⓪ 虎鲸无自然系友方 → 不触发（allies=0 → null）',
      conditionalAtk({ attacker: o, target: 'card', defender: {}, friendlyField: [o] }, P) === null)
    // 3 个自然系友方 + 1 个异阵营(不计) + 自己(不计)
    const field = [o, ally('nature', 'n1'), ally('nature', 'n2'), ally('nature', 'n3'), ally('body', 'b1')]
    const ev = conditionalAtk({ attacker: o, target: 'card', defender: {}, friendlyField: field }, P)
    ok('⓪ 虎鲸 3 自然系友方 → RUSH_BOOST', ev && ev.type === 'RUSH_BOOST')
    ok('⓪ 虎鲸倍率 = (8500 + 1500×3)/8500（异阵营 body 与自己都不计）',
      ev && ev.mods.damageMultiplier === (8500 + 1500 * 3) / 8500)
  }
}

// 3) 神经元「突触传递」—— 攻击后随机友方获 swift_boost（uid-keyed，位置无关）
{
  const neuron = byName('神经元·闪电信使')
  ok('⓪ 找得到神经元·闪电信使', !!neuron)
  if (neuron) {
    const n = mk(neuron, 'neu1')
    const a1 = ally('body', 'ally1')
    const handler = skillRegistry['Synaptic Relay']
    ok('⓪ Synaptic Relay 在 registry 里', !!handler && !!handler.execute)
    const ev = handler.execute({ attacker: n, card: n, target: 'card', defender: {}, friendlyField: [n, a1] })
    ok('⓪ 神经元发 APPLY_STATUS / swift_boost / 命中友方(非己)',
      ev && ev.type === 'APPLY_STATUS' && ev.status.type === 'swift_boost' && ev.targetUid === 'ally1')
    ok('⓪ 神经元无其他友方 → null',
      handler.execute({ attacker: n, card: n, target: 'card', defender: {}, friendlyField: [n] }) === null)
    ok('⓪ 神经元直攻主人不触发（leader 门）',
      handler.execute({ attacker: n, card: n, target: 'leader', friendlyField: [n, a1] }) === null)
  }
}

// ============ ① 源码级接线哨兵：生产调用点必须传 friendlyField ============
const ub = readFileSync(join(ROOT, 'src/hooks/useBattle.js'), 'utf8')
const onAttackCalls = [...ub.matchAll(/triggerSkills\('onAttack',\s*\{[\s\S]*?\n\s*\}\)/g)].map((m) => m[0])
ok('① useBattle 有 2 个 onAttack 调用点（1 直攻主人 + 1 打卡）', onAttackCalls.length === 2)
ok('① 两个 onAttack 调用点都传 friendlyField: battleStateRef.current[side].field（漏一个 → 那条路径三技能哑火）',
  onAttackCalls.length === 2 && onAttackCalls.every((c) => /friendlyField:\s*battleStateRef\.current\[side\]\.field/.test(c)))

// ============ ② 模板级哨兵：蜜蜂自伤 _side 必须是 'attacker' ============
const tpl = readFileSync(join(ROOT, 'src/engine/skillTemplates.js'), 'utf8')
const sdStart = tpl.indexOf('if (params.self_damage)')
const sd = sdStart >= 0 ? tpl.slice(sdStart, sdStart + 700) : ''
ok('② 蜜蜂 self_damage 的 AOE_DAMAGE 用 _side: "attacker"（不是 "friendly" → 落敌方）',
  /_side:\s*'attacker'/.test(sd) && !/_side:\s*'friendly'/.test(sd))

console.log(`\n${fail === 0 ? '✅' : '⚠️'} test-onattack-friendly-field: 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
