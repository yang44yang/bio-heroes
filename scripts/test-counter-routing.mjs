#!/usr/bin/env node
// 反击(onHitCounter counter_damage)路由回归测试
// 2026-06-27：齐齐"做A"。修 task_5b9a7c7c —— 荆棘反击(仙人掌)/海葵刺(小丑鱼)的反伤落错方、技能哑火。
// 旧 bug：onHitCounter 用 ctx.friendlyField(从不传)定位攻击者 slot → 永远=0；_side:'attacker_side'(applySkillEvents 不认)
//   + AOE_DAMAGE 恒走 enemySetter → 反伤打到错误一方的 slot0，攻击者根本没被反击。
// 修法：onHit 触发点传 attackerField(攻击者的场)；onHitCounter 用 ctx.attackerField 定位 slot + _side:'attacker'；
//   AOE_DAMAGE 认 _side==='attacker' → 走 friendlySetter(攻击者那方，= 本次 applySkillEvents 的 friendly)。
// preview 实测确认 + grep 接线断言。
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { onHitCounter } from '../src/engine/skillTemplates.js'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }

// ⓪ 功能测试（直接 import 纯函数 onHitCounter）：模拟海葵刺被攻击 → 返回打到"攻击者真实 slot"的 AOE_DAMAGE
const _atk = { uid: 'atk1', name: '蜜蜂', atk: 2000, currentHp: 1500 }
const _def = { uid: 'def1', name: '小丑鱼·海葵之家', currentHp: 3000 }
const _ev = onHitCounter({ attacker: _atk, defender: _def, attackerField: [null, _atk, null] }, { effect: 'counter_damage', amount: 1000 })
ok('⓪ onHitCounter 返回 AOE_DAMAGE / _side=attacker / targetSlot=攻击者真实slot(1) / dmg=1000 / 命中攻击者uid',
  _ev && _ev.type === 'AOE_DAMAGE' && _ev._side === 'attacker' && _ev.targetSlot === 1 && _ev.damage === 1000 && _ev.targetUid === 'atk1')
ok('⓪ is_ratio 模式按攻击者 ATK 比例反伤',
  (() => { const e = onHitCounter({ attacker: { ..._atk }, defender: _def, attackerField: [_atk] }, { effect: 'counter_damage', amount: 0.5, is_ratio: true }); return e && e.damage === 1000 })())

const ub = readFileSync(join(ROOT, 'src/hooks/useBattle.js'), 'utf8')
const tpl = readFileSync(join(ROOT, 'src/engine/skillTemplates.js'), 'utf8')

// ① onHitCounter counter_damage：用 ctx.attackerField 定位 + _side:'attacker'（不再用 friendlyField/'attacker_side'）
const ccStart = tpl.indexOf("case 'counter_damage'")
const cc = ccStart >= 0 ? tpl.slice(ccStart, ccStart + 1100) : ''
ok('① counter_damage 用 ctx.attackerField 定位攻击者 slot',
  /atkSlot\s*=\s*\(ctx\.attackerField\s*\|\|\s*\[\]\)\.findIndex/.test(cc))
ok('① counter_damage 发 _side: "attacker"（带逗号收尾，区别于注释里提到的旧 attacker_side）',
  /_side:\s*'attacker',/.test(cc))
ok('① 不再用 ctx.friendlyField 定位攻击者（旧 bug：从不传 → slot 恒 0）',
  !/atkSlot\s*=\s*\(ctx\.friendlyField/.test(cc))

// ② applySkillEvents AOE_DAMAGE：_side==='attacker' → friendlySetter（反击打攻击者那方）
const aoeStart = ub.indexOf("case 'AOE_DAMAGE'")
const aoe = aoeStart >= 0 ? ub.slice(aoeStart, aoeStart + 500) : ''
ok('② AOE_DAMAGE 按 _side==="attacker" 选 friendlySetter，否则 enemySetter',
  /dmgSetter\s*=\s*evt\._side\s*===\s*'attacker'\s*\?\s*friendlySetter\s*:\s*enemySetter/.test(aoe))
ok('② AOE_DAMAGE 用 dmgSetter（不再写死 enemySetter）',
  /dmgSetter\(prev\s*=>/.test(aoe))

// ③ 两个 onHit 触发点都传 attackerField（玩家攻击 = playerFieldRef，敌方攻击 = enemyFieldRef）
const hitCalls = [...ub.matchAll(/triggerSkills\('onHit',\s*\{[^}]*\}/g)].map(m => m[0])
ok('③ onHit 触发点共 2 处', hitCalls.length === 2)
ok('③ 每个 onHit 都传 attackerField', hitCalls.every(c => /attackerField:/.test(c)))
ok('③ 玩家攻击侧传 playerFieldRef、敌方攻击侧传 enemyFieldRef',
  hitCalls.some(c => /attackerField:\s*playerFieldRef\.current/.test(c)) &&
  hitCalls.some(c => /attackerField:\s*enemyFieldRef\.current/.test(c)))

console.log(`\n${fail === 0 ? '✅' : '⚠️'} 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
