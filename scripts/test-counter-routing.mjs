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

// ③ onHit 触发点必须传 attackerField（onHitCounter 据此定位攻击者 slot，反击才落到正确目标）
//
// S5 de-fork（2026-07-17）：attack 与 aiAttack 已合并 → onHit 触发点从 **2 处变 1 处**。
// 本条此前断言「共 2 处」且「一处传 player.field、一处传 enemy.field」—— 它守的正是
// CLAUDE.md 那条「改战斗规则须玩家/AI 两处同步改」的规矩，而 de-fork 就是在删掉那条规矩。
// 不变式没变（攻击者的场必须是**行动方自己的**场），但从「两处都得记着写对」变成了
// **结构保证**：一处 `battleStateRef.current[side].field`，side 参数化，写不错。
const hitCalls = [...ub.matchAll(/triggerSkills\('onHit',\s*\{[^}]*\}/g)].map(m => m[0])
ok('③ onHit 触发点共 1 处（S5 de-fork：玩家/AI 已合并）', hitCalls.length === 1)
ok('③ 每个 onHit 都传 attackerField', hitCalls.every(c => /attackerField:/.test(c)))
// E5c-5：field 迁进 reducer → attackerField 读走 battleStateRef.current.<side>.field
// S5：side 参数化后不再是「两个写死的调用点」，而是一处按 side 索引 → 两侧必然一致。
ok('③ attackerField 必须按 side 索引（不得再写死某一侧 —— 那是 fork 复活的征兆）',
  hitCalls.every(c => /attackerField:\s*battleStateRef\.current\[side\]\.field/.test(c)))

// ④ MRSA·耐药壁垒 反弹路由修复（决策D）—— 与 onHitCounter 同款 _side:'attacker' + ctx.attackerField
const reg = readFileSync(join(ROOT, 'src/engine/skillRegistry.js'), 'utf8')
const abStart = reg.indexOf("'Antibiotic Resistance'")
const ab = abStart >= 0 ? reg.slice(abStart, abStart + 1300) : ''
ok('④ Antibiotic Resistance 反弹用 ctx.attackerField 定位攻击者（不再 ctx.enemyField 恒 -1→0）',
  /atkSlot\s*=\s*\(ctx\.attackerField\s*\|\|\s*\[\]\)\.findIndex/.test(ab))
ok('④ Antibiotic Resistance 反弹发 _side: "attacker"（不再 attacker_side 落错方）',
  /_side:\s*'attacker',/.test(ab) && !/attacker_side/.test(ab))

// ⑤ 决策E3：attack/aiAttack 的「结算落地」共享 applyCombatOutcome（不再各写一遍双 setState 块）
ok('⑤ applyCombatOutcome 已定义', /function applyCombatOutcome\(/.test(ub))
ok('⑤ attack/aiAttack 两处都调 applyCombatOutcome（去重）', (ub.match(/applyCombatOutcome\(\{/g) || []).length >= 2)
ok('⑤ 结算里的护盾 setState 块已收敛（源码不再有 3+ 处 applyShieldAbsorb(next[…]）',
  (ub.match(/applyShieldAbsorb\(next\[/g) || []).length <= 2)

// ⑥ 决策E5a：state-mirror 双写收进 useLatestRef，不再有裸 `xRef.current = x` 顶层镜像写
// ⚠️ E5c 起逐组把 state 迁进 battleReducer，对应的 useLatestRef 会**逐步退役**
//    （E5c-0 已退役 playerPowerBankRef/enemyPowerBankRef，新增 battleStateRef）。
//    故下界随迁移下调；核心不变式仍是「没有裸镜像双写」。
ok('⑥ useBattle 不再有裸镜像双写（顶层 xRef.current = x）', !/^ {2}\w+Ref\.current = \w+$/m.test(ub))
ok('⑥ state-mirror 仍走 useLatestRef helper（≥4 处，E5c 迁移中逐步退役）', (ub.match(/= useLatestRef\(/g) || []).length >= 4)

// ⑦ 决策E5c-0：Power Bank 迁进 battleReducer（reducer 拿最新 state + 原子改）
ok('⑦ 引入 useReducer(battleReducer)', /useReducer\(battleReducer/.test(ub))
ok('⑦ Power Bank 写全走 dispatch（POWERBANK_*），不再 setPlayer/EnemyPowerBank',
  /dispatch\(\{\s*type:\s*'POWERBANK_/.test(ub) && !/set(Player|Enemy)PowerBank/.test(ub))
ok('⑦ battleStateRef 供异步读最新（AI 回合 / latest 快照）', /battleStateRef\s*=\s*useLatestRef\(battleState\)/.test(ub))

// ⑦ 决策E5c-1：弃牌堆迁进 battleReducer
ok('⑦ 弃牌堆写全走 dispatch（DISCARD_*），不再 setPlayer/EnemyDiscard',
  /dispatch\(\{\s*type:\s*'DISCARD_/.test(ub) && !/set(Player|Enemy)Discard/.test(ub))
ok('⑦ 弃牌堆读全走 battleStateRef，不再 player/enemyDiscardRef',
  !/(player|enemy)DiscardRef/.test(ub))

// ⑦ 决策E5c-2：能量迁进 battleReducer（ENERGY_SET/ADD/SPEND）
ok('⑦ 能量写全走 dispatch（ENERGY_*），不再 setPlayer/EnemyEnergy',
  /dispatch\(\{\s*type:\s*'ENERGY_(SET|ADD|SPEND)'/.test(ub) && !/set(Player|Enemy)Energy/.test(ub))
ok('⑦ 能量读全走 battleStateRef，不再 player/enemyEnergyRef',
  !/(player|enemy)EnergyRef/.test(ub))

// ⑦ 决策E5c-3：主人 HP 迁进 battleReducer（LEADER_DAMAGE/HEAL/SET delta 累加）
ok('⑦ 主人 HP 写走 dispatch（LEADER_*）',
  /dispatch\(\{\s*type:\s*'LEADER_(DAMAGE|HEAL|SET)'/.test(ub))
ok('⑦ 主人 HP 状态镜像 ref 已退役（仅剩 Init 阈值 ref）',
  !/(player|enemy)LeaderHpRef\b/.test(ub) && /(player|enemy)InitLeaderHpRef/.test(ub))
ok('⑦ 胜负判定仍在调用端（reducer 纯，不碰 winner/phase）',
  /battleReducer/.test(ub) && !/setWinner|setPhase/.test(readFileSync(join(ROOT, 'src/engine/battleReducer.js'), 'utf8')))

// ⑦ 决策E5c-4：turn/phase/winner 迁进 battleReducer
ok('⑦ turn/phase/winner 写走 dispatch（TURN_SET/PHASE_SET/WINNER_SET/GAME_OVER）',
  /dispatch\(\{\s*type:\s*'(TURN_SET|PHASE_SET|WINNER_SET|GAME_OVER)'/.test(ub) &&
  !/\bsetTurn\b|\bsetPhase\b|\bsetWinner\b/.test(ub))
ok('⑦ 胜负走原子 GAME_OVER（winner+phase 一步）', /dispatch\(\{\s*type:\s*'GAME_OVER',\s*winner:/.test(ub))
ok('⑦ turnRef 退役（读走 battleStateRef.current.turn）',
  !/turnRef/.test(ub) && /battleStateRef\.current\.turn/.test(ub))

// ⑦ 决策E5c-5：战场 field 迁进 battleReducer（FIELD_UPDATE，setter 垫片透传 updater）
ok('⑦ field 写全走 dispatch（FIELD_UPDATE），setPlayerField/setEnemyField 是垫片',
  /dispatch\(\{\s*type:\s*'FIELD_UPDATE',\s*side:\s*'player',\s*value:\s*u\s*\}\)/.test(ub) &&
  /dispatch\(\{\s*type:\s*'FIELD_UPDATE',\s*side:\s*'enemy',\s*value:\s*u\s*\}\)/.test(ub))
ok('⑦ field 状态镜像 ref 已退役（无 player/enemyFieldRef）', !/(player|enemy)FieldRef/.test(ub))
ok('⑦ field 派生自 reducer（battleState.<side>.field）', /battleState\.player\.field/.test(ub) && /battleState\.enemy\.field/.test(ub))
ok('⑦ 击杀判定确定性算（不再 updater 闭包 defKilled=true 读回）',
  /const defKilled = Math\.max\(0, defCard\.currentHp - defActualDmg\)/.test(ub) &&
  /const atkKilled = Math\.max\(0, atkCard\.currentHp - atkActualDmg\)/.test(ub))
ok('⑦ FIELD_UPDATE 有引用相等 bailout（next === cur）',
  /case 'FIELD_UPDATE'[\s\S]{0,200}if \(next === cur\) return state/.test(readFileSync(join(ROOT, 'src/engine/battleReducer.js'), 'utf8')))

// ⑧ 回归（AI 冻结 bug）：E5c-3 在 handlePostAttackSkills 的溢出伤害循环里用了 oppSide 却没在本函数定义，
//    → 击杀防守方(defKilled)时 ReferenceError，异步 AI 回合被 reject、卡死不进下一回合。
//    守：凡在函数体内用 [oppSide] / side: oppSide 的地方，本函数必须先 const oppSide=。
{
  // 用「每个 function/const…=(…)=>{ 到下一个同类声明」粗切函数块，逐块查 oppSide 定义先于使用
  const funcStarts = [...ub.matchAll(/\n  (?:function \w+|const \w+ = useCallback\(|const \w+ = \()/g)].map(m => m.index)
  funcStarts.push(ub.length)
  let bad = null
  for (let i = 0; i < funcStarts.length - 1; i++) {
    const block = ub.slice(funcStarts[i], funcStarts[i + 1])
    const useIdx = block.search(/\[oppSide\]|side:\s*oppSide/)
    if (useIdx < 0) continue // 本块不用 oppSide
    const defIdx = block.search(/const oppSide\s*=/)
    if (defIdx < 0 || defIdx > useIdx) { bad = block.slice(0, 40).trim(); break }
  }
  ok('⑧ 每个用 oppSide 的函数都先定义了它（防 handlePostAttackSkills 类 ReferenceError 冻结 AI）', bad === null)
}
ok('⑧ handlePostAttackSkills 明确定义 oppSide',
  /function handlePostAttackSkills[\s\S]{0,120}const oppSide\s*=\s*side === 'player'/.test(ub))

console.log(`\n${fail === 0 ? '✅' : '⚠️'} 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
