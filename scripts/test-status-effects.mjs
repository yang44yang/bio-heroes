#!/usr/bin/env node
// statusEffects 纯函数执行式单测（2026-07-12，审计对抗核实确认的最高杠杆盲区）——
//   processStatuses 是每回合结算热路径（useBattle:712 对每张场上卡各调一次），此前零执行覆盖、
//   只被 test-counter-routing 对 useBattle 源码文本正则弱校验。这里直接 import 跑逻辑、断言
//   mutation（currentHp / atk / statuses.turnsLeft）+ 返回事件，覆盖全 13 状态分支 +
//   removeNegativeStatuses 三 filter + applyShieldAbsorb 全路径。金标准同 test-battle-reducer。
import { processStatuses, removeNegativeStatuses, applyShieldAbsorb } from '../src/engine/statusEffects.js'

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }
const mk = (statuses = [], extra = {}) => ({ name: 'T', currentHp: 3000, maxHp: 3000, atk: 2000, statuses, ...extra })
const hasEvt = (evts, t) => evts.some(e => e.type === t)
const types = (card) => card.statuses.map(s => s.type)
const stOf = (card, type) => card.statuses.find(s => s.type === type)

// ============ processStatuses：守卫 ============
ok('null card → []', Array.isArray(processStatuses(null)) && processStatuses(null).length === 0)
ok('card 无 statuses 字段 → []', processStatuses({ name: 'T', currentHp: 100 }).length === 0)
ok('空 statuses → []', processStatuses(mk([])).length === 0)

// ============ poison：扣血 + 事件 + turnsLeft 递减/到期 ============
{
  const c = mk([{ type: 'poison', damage: 500, turnsLeft: 2 }])
  const e = processStatuses(c)
  ok('poison 扣血 3000→2500', c.currentHp === 2500)
  ok('poison 发 POISON_TICK', hasEvt(e, 'POISON_TICK'))
  ok('poison turnsLeft 2→1 保留', stOf(c, 'poison')?.turnsLeft === 1)
}
{
  const c = mk([{ type: 'poison', damage: 500, turnsLeft: 1 }])
  const e = processStatuses(c)
  ok('poison 最后一回合仍扣血', c.currentHp === 2500)
  ok('poison turnsLeft 1 → 到期移除', !types(c).includes('poison'))
  ok('poison 到期仍发 tick 事件', hasEvt(e, 'POISON_TICK'))
}

// ============ shield：不按回合消耗、processStatuses 不扣血 ============
{
  const c = mk([{ type: 'shield', amount: 1500 }])
  const e = processStatuses(c)
  ok('shield 原样保留（不递减）', stOf(c, 'shield')?.amount === 1500)
  ok('shield processStatuses 不扣血', c.currentHp === 3000)
  ok('shield 无事件', e.length === 0)
}

// ============ sleep：tick / 到期唤醒 ============
{
  const c = mk([{ type: 'sleep', turnsLeft: 2 }])
  const e = processStatuses(c)
  ok('sleep 2→1 保留 + SLEEP_TICK', stOf(c, 'sleep')?.turnsLeft === 1 && hasEvt(e, 'SLEEP_TICK'))
}
{
  const c = mk([{ type: 'sleep', turnsLeft: 1 }])
  const e = processStatuses(c)
  ok('sleep 到期移除 + SLEEP_CLEAR', !types(c).includes('sleep') && hasEvt(e, 'SLEEP_CLEAR'))
}

// ============ 结构同型「递减到期清除」分支：immune / immune_tech / stealth / swift_boost / ecosystem_shelter ============
for (const [type, clearEvt] of [
  ['immune', 'IMMUNE_CLEAR'],
  ['immune_tech', 'IMMUNE_TECH_CLEAR'],
  ['stealth', 'STEALTH_CLEAR'],
  ['swift_boost', 'SWIFT_CLEAR'],
  ['ecosystem_shelter', 'ECOSYSTEM_SHELTER_CLEAR'],
]) {
  const c2 = mk([{ type, turnsLeft: 2 }])
  const e2 = processStatuses(c2)
  ok(`${type} turnsLeft 2→1 保留、未到期无清除事件`, stOf(c2, type)?.turnsLeft === 1 && !hasEvt(e2, clearEvt))
  const c1 = mk([{ type, turnsLeft: 1 }])
  const e1 = processStatuses(c1)
  ok(`${type} 到期移除 + ${clearEvt}`, !types(c1).includes(type) && hasEvt(e1, clearEvt))
}

// ============ 「持续不递减」分支：deep_pressure / herd_immunity / marked ============
for (const type of ['deep_pressure', 'herd_immunity', 'marked']) {
  const c = mk([{ type, turnsLeft: 99, amount: 1 }])
  const e = processStatuses(c)
  ok(`${type} 持续保留、turnsLeft 不递减`, types(c).includes(type) && stOf(c, type)?.turnsLeft === 99)
  ok(`${type} 无到期事件`, e.length === 0)
}

// ============ confused：tick / 到期恢复 ============
{
  const c = mk([{ type: 'confused', turnsLeft: 2 }])
  const e = processStatuses(c)
  ok('confused 2→1 保留 + CONFUSED_TICK', stOf(c, 'confused')?.turnsLeft === 1 && hasEvt(e, 'CONFUSED_TICK'))
}
{
  const c = mk([{ type: 'confused', turnsLeft: 1 }])
  const e = processStatuses(c)
  ok('confused 到期移除 + CONFUSED_CLEAR', !types(c).includes('confused') && hasEvt(e, 'CONFUSED_CLEAR'))
}

// ============ ★ atk_boost：审计点名的高危分支 ============
// buff 时把 amount 加进了 card.atk，到期必须减回；否则加成永不消退 → 齐齐看到怪越打越强，且无测试可拦。
{
  const c = mk([{ type: 'atk_boost', amount: 1000, turnsLeft: 2 }], { atk: 3000 })
  processStatuses(c)
  ok('atk_boost 未到期 → atk 不动 + 保留递减', c.atk === 3000 && stOf(c, 'atk_boost')?.turnsLeft === 1)
}
{
  const c = mk([{ type: 'atk_boost', amount: 1000, turnsLeft: 1 }], { atk: 3000 })
  const e = processStatuses(c)
  ok('atk_boost 到期 → atk 减回 3000→2000', c.atk === 2000)
  ok('atk_boost 到期 → 移除 + ATK_BOOST_CLEAR', !types(c).includes('atk_boost') && hasEvt(e, 'ATK_BOOST_CLEAR'))
}
{
  // Math.max(0) 兜底：amount > atk 不产生负 atk
  const c = mk([{ type: 'atk_boost', amount: 5000, turnsLeft: 1 }], { atk: 2000 })
  processStatuses(c)
  ok('atk_boost 到期 amount>atk → atk 兜底 0（不为负）', c.atk === 0)
}

// ============ default：未知状态原样保留 ============
{
  const c = mk([{ type: 'brand_new_status_xyz', turnsLeft: 3 }])
  const e = processStatuses(c)
  ok('未知状态原样保留（default 分支）', types(c).includes('brand_new_status_xyz'))
  ok('未知状态无事件', e.length === 0)
}

// ============ 多状态同回合一起处理（集成）============
{
  const c = mk([
    { type: 'poison', damage: 500, turnsLeft: 1 },
    { type: 'atk_boost', amount: 1000, turnsLeft: 1 },
    { type: 'shield', amount: 800 },
  ], { atk: 3000, currentHp: 3000 })
  const e = processStatuses(c)
  ok('多状态：poison 扣血 + atk_boost 减回 + shield 保留',
    c.currentHp === 2500 && c.atk === 2000 &&
    types(c).includes('shield') && !types(c).includes('poison') && !types(c).includes('atk_boost'))
  ok('多状态：发 POISON_TICK + ATK_BOOST_CLEAR', hasEvt(e, 'POISON_TICK') && hasEvt(e, 'ATK_BOOST_CLEAR'))
}

// ============ removeNegativeStatuses：三 filter + 守卫 ============
ok('removeNeg null card → []', removeNegativeStatuses(null, 'poison').length === 0)
ok('removeNeg 空 statuses → []', removeNegativeStatuses(mk([]), 'all_negative').length === 0)
{
  const c = mk([{ type: 'poison', turnsLeft: 2 }, { type: 'shield', amount: 1 }, { type: 'sleep', turnsLeft: 2 }])
  const removed = removeNegativeStatuses(c, 'poison')
  ok("filter='poison' 只移 poison、留 shield/sleep",
    removed.includes('poison') && !types(c).includes('poison') && types(c).includes('shield') && types(c).includes('sleep'))
}
{
  const c = mk([{ type: 'poison', turnsLeft: 2 }, { type: 'sleep', turnsLeft: 2 }, { type: 'deep_pressure', turnsLeft: 99 }, { type: 'shield', amount: 1 }, { type: 'immune', turnsLeft: 2 }])
  const removed = removeNegativeStatuses(c, 'all_negative')
  ok("filter='all_negative' 移 poison/sleep/deep_pressure", ['poison', 'sleep', 'deep_pressure'].every(t => removed.includes(t)))
  ok("filter='all_negative' 留正面 shield/immune", types(c).includes('shield') && types(c).includes('immune') && c.statuses.length === 2)
}
{
  const c = mk([{ type: 'poison', turnsLeft: 2 }, { type: 'shield', amount: 1 }])
  const removed = removeNegativeStatuses(c, 'one_random')
  ok("filter='one_random' 单负面 → 确定移 poison、留 shield",
    removed.length === 1 && removed[0] === 'poison' && !types(c).includes('poison') && types(c).includes('shield'))
}
{
  const c = mk([{ type: 'poison', turnsLeft: 2 }, { type: 'sleep', turnsLeft: 2 }, { type: 'deep_pressure', turnsLeft: 99 }])
  const before = c.statuses.length
  const removed = removeNegativeStatuses(c, 'one_random')
  ok("filter='one_random' 多负面 → 恰移 1 个负面",
    removed.length === 1 && ['poison', 'sleep', 'deep_pressure'].includes(removed[0]) && c.statuses.length === before - 1)
}
{
  const c = mk([{ type: 'shield', amount: 1 }, { type: 'immune', turnsLeft: 2 }])
  const removed = removeNegativeStatuses(c, 'all_negative')
  ok('无负面 → 移除空、statuses 不变', removed.length === 0 && c.statuses.length === 2)
}

// ============ applyShieldAbsorb：全路径 ============
ok('applyShieldAbsorb 无 statuses → 原样', applyShieldAbsorb({ name: 'T' }, 1500) === 1500)
ok('applyShieldAbsorb 无 shield → 原样', applyShieldAbsorb(mk([{ type: 'poison', turnsLeft: 2 }]), 1500) === 1500)
{
  const c = mk([{ type: 'shield', amount: 2000 }])
  const dealt = applyShieldAbsorb(c, 1500)
  ok('护盾>伤害 → 实际伤害 0', dealt === 0)
  ok('护盾>伤害 → 护盾减到 500、保留', stOf(c, 'shield')?.amount === 500)
}
{
  const c = mk([{ type: 'shield', amount: 2000 }])
  const dealt = applyShieldAbsorb(c, 2000)
  ok('护盾==伤害 → 实际 0、amount 归 0 仍保留', dealt === 0 && stOf(c, 'shield')?.amount === 0)
}
{
  const c = mk([{ type: 'shield', amount: 1000 }, { type: 'poison', turnsLeft: 2 }])
  const dealt = applyShieldAbsorb(c, 3000)
  ok('护盾<伤害 → 溢出 2000', dealt === 2000)
  ok('护盾<伤害 → 护盾打碎移除、poison 保留', !types(c).includes('shield') && types(c).includes('poison'))
}

console.log(`\n${fail === 0 ? '✅' : '❌'} status-effects 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
