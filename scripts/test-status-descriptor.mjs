#!/usr/bin/env node
// statusDescriptor 纯逻辑：human-readable 描述 + 小卡 badges 汇总
import { describeStatus, smallBadgesFor } from '../src/utils/statusDescriptor.js'

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }

// ---- describeStatus 每个 type ----
const shield = describeStatus({ type: 'shield', amount: 1500 })
ok('shield emoji+label', shield.emoji === '🛡️' && shield.label === '护盾')
ok('shield detail 含数值', /1500/.test(shield.detail))
ok('shield kind buff', shield.kind === 'buff')

const poison = describeStatus({ type: 'poison', damage: 500, turnsLeft: 3 })
ok('poison 含每回合 -N + 剩 N 回合', /-500/.test(poison.detail) && /剩 3/.test(poison.detail))
ok('poison kind debuff', poison.kind === 'debuff')

const sleep = describeStatus({ type: 'sleep', turnsLeft: 2 })
ok('sleep 含剩 N 回合', /剩 2/.test(sleep.detail))

const atkUp = describeStatus({ type: 'atk_boost', amount: 3500, turnsLeft: 99, source: '基因突变' })
ok('atk_boost +正 → 💪 增益', atkUp.emoji === '💪' && atkUp.label === 'ATK 增益' && atkUp.kind === 'buff')
ok('atk_boost +正 detail 含 +3500 + 永久 + 来源', /\+3500/.test(atkUp.detail) && /永久/.test(atkUp.detail) && /基因突变/.test(atkUp.detail))

const atkDown = describeStatus({ type: 'atk_boost', amount: -3500, turnsLeft: 2, source: '耐药屏障' })
ok('atk_boost -负 → ⬇️ 减益', atkDown.emoji === '⬇️' && atkDown.label === 'ATK 减益' && atkDown.kind === 'debuff')
ok('atk_boost 负值 detail 显示负号', /-3500/.test(atkDown.detail))

const immune = describeStatus({ type: 'immune_tech', turnsLeft: 99 })
ok('immune_tech 99 → 永久', /永久/.test(immune.detail))

const immuneN = describeStatus({ type: 'immune_tech', turnsLeft: 1 })
ok('immune_tech 1 回合 → 剩 1', /剩 1/.test(immuneN.detail))

const swift = describeStatus({ type: 'swift_boost', turnsLeft: 1 })
ok('swift_boost emoji ⚡ + buff', swift.emoji === '⚡' && swift.kind === 'buff')

const herd = describeStatus({ type: 'herd_immunity', uses: 1 })
ok('herd_immunity uses 1 → 可抵消 1 次', /1 次/.test(herd.detail))

const evtDebuff = describeStatus({ type: 'event_debuff', event: 'global_warming', stat: 'atk', amount: 500, turnsLeft: 2 })
ok('event_debuff 含事件名 + 数值', /global_warming/.test(evtDebuff.detail) && /500/.test(evtDebuff.detail))

ok('未知 type 不崩', describeStatus({ type: 'mystery' })?.label === 'mystery')
ok('null 守卫', describeStatus(null) === null && describeStatus(undefined) === null)

// ---- smallBadgesFor 汇总 ----
const noBadges = smallBadgesFor([])
ok('空数组 → 0 badges', Array.isArray(noBadges) && noBadges.length === 0)

const onlyShield = smallBadgesFor([{ type: 'shield', amount: 1500 }])
ok('只有 shield → 0 badges (顶部已有专属角标，不重复)', onlyShield.length === 0)

const atkSumPos = smallBadgesFor([
  { type: 'atk_boost', amount: 1500 },
  { type: 'atk_boost', amount: 2000 },
])
ok('多个 atk_boost 汇总 +3500', atkSumPos.length === 1 && atkSumPos[0].text === '💪+3500')

const atkSumMix = smallBadgesFor([
  { type: 'atk_boost', amount: 3000 },
  { type: 'atk_boost', amount: -1000 },
])
ok('混合 atk_boost 汇总 +2000', atkSumMix[0].text === '💪+2000')

const atkNeg = smallBadgesFor([{ type: 'atk_boost', amount: -2000 }])
ok('纯负 atk_boost → ⬇ badge', atkNeg[0].text === '⬇-2000')

const allFancy = smallBadgesFor([
  { type: 'atk_boost', amount: 1500 },
  { type: 'immune_tech', turnsLeft: 99 },
  { type: 'swift_boost', turnsLeft: 1 },
  { type: 'herd_immunity', uses: 1 },
  { type: 'event_debuff', event: 'storm', stat: 'atk', amount: 500, turnsLeft: 1 },
])
ok('全特殊状态 → 5 badges', allFancy.length === 5)
ok('包含 💪/🛡️/⚡/🩹/⚠️ 关键字',
  allFancy.some(b => /💪/.test(b.text)) &&
  allFancy.some(b => /免科技/.test(b.text)) &&
  allFancy.some(b => /迅击/.test(b.text)) &&
  allFancy.some(b => /群免/.test(b.text)) &&
  allFancy.some(b => /环境/.test(b.text))
)

ok('null/非数组 不崩', smallBadgesFor(null).length === 0 && smallBadgesFor(undefined).length === 0)

console.log(`\n${fail === 0 ? '✅' : '⚠️'} 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
