#!/usr/bin/env node
// onTurnEnd 技能分派回归测试
// 2026-06-27：齐齐"做A"修引擎正确性。挖出 onTurnEnd dispatcher 不完整 → 多个技能哑火：
//   - Nutrient Hijack/Nutrient Drain(蛔虫吸血, passiveDrain → OVERFLOW_DAMAGE + 主人HEAL)：onTurnEnd 原本不处理 OVERFLOW_DAMAGE、
//     且回己方主人血的 HEAL(targetUid '__leader__')按字段卡 uid 找不到 → 完全没生效。
//   - Hematopoiesis / T-Cell Training(改后, passiveDraw interval:2 → DRAW_CARD)：onTurnEnd 不处理 DRAW_CARD + 不传 turn → 永不抽。
// 修法：onTurnEnd ctx 补 turn；dispatcher 补 OVERFLOW_DAMAGE(扣敌方主人)/DRAW_CARD(抽牌)/_leaderHeal HEAL(回己方主人) 三个 case。
// preview 实测：蛔虫上场结束回合 → 敌方主人 30000→29500(吸血生效)。grep 接线断言。
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }

const ub = readFileSync(join(ROOT, 'src/hooks/useBattle.js'), 'utf8')
const reg = readFileSync(join(ROOT, 'src/engine/skillRegistry.js'), 'utf8')
const cards = readFileSync(join(ROOT, 'src/data/cards.js'), 'utf8')

// ① onTurnEnd 触发传 turn（interval 类技能如胸腺每2回合抽牌靠它判回合）
ok('① onTurnEnd triggerSkills 传 turn: turnRef.current',
  /triggerSkills\(\s*'onTurnEnd'[\s\S]{0,160}turn:\s*turnRef\.current/.test(ub))

// ② processEndOfTurnEffects 派生主人 setter（吸血扣敌方主人 / 回己方主人）
const peStart = ub.indexOf('function processEndOfTurnEffects')
const pe = peStart >= 0 ? ub.slice(peStart, peStart + 2600) : ''
ok('② 派生 selfLeaderSetter(回己方主人)', /selfLeaderSetter\s*=\s*side === 'player'\s*\?\s*setPlayerLeaderHp\s*:\s*setEnemyLeaderHp/.test(pe))
ok('② 派生 enemyLeaderSetter(扣敌方主人)', /enemyLeaderSetter\s*=\s*side === 'player'\s*\?\s*setEnemyLeaderHp\s*:\s*setPlayerLeaderHp/.test(pe))

// ③ dispatcher 三个新 case 都接上（之前缺 → 技能哑火）
ok('③ OVERFLOW_DAMAGE → 扣敌方主人血(蛔虫吸血)',
  /evt\.type === 'OVERFLOW_DAMAGE'[\s\S]{0,120}enemyLeaderSetter\(hp => Math\.max\(0, hp - evt\.damage\)\)/.test(pe))
ok('③ DRAW_CARD → drawCards/aiDrawCards 抽牌(胸腺)',
  /evt\.type === 'DRAW_CARD'[\s\S]{0,160}drawCards\s*:\s*handsRef\.current\.aiDrawCards/.test(pe))
ok('③ _leaderHeal HEAL → 回己方主人(原按字段卡 uid 找 __leader__ 找不到)',
  /evt\.type === 'HEAL'[\s\S]{0,80}evt\._leaderHeal[\s\S]{0,120}selfLeaderSetter\(hp => Math\.min\(LEADER_HP/.test(pe))

// ④ skillRegistry：T-Cell 改 passiveDraw、蛔虫保持 passiveDrain
ok('④ T-Cell Training → passiveDraw(interval:2)(原 passiveHeal 与描述不符)',
  /'T-Cell Training':[\s\S]{0,80}passiveDraw\(ctx,\s*\{\s*amount:\s*1,\s*interval:\s*2\s*\}\)/.test(reg))
ok('④ Nutrient Hijack → passiveDrain(吸血)', /'Nutrient Hijack':[\s\S]{0,80}passiveDrain\(ctx,\s*\{\s*amount:\s*500\s*\}\)/.test(reg))

// ⑤ 卡描述与实现对齐（描述≠实现 修复的核心）
const tcell = cards.indexOf('"T-Cell Training"')
ok('⑤ 胸腺 T-Cell 描述写"抽…张牌"(不再写"搜索…加入手牌")',
  /抽 1 张牌/.test(cards.slice(tcell, tcell + 200)) && !/搜索一张人体系·血液免疫卡/.test(cards.slice(tcell, tcell + 200)))
const nut = cards.indexOf('"Nutrient Hijack"')
ok('⑤ 蛔虫 Nutrient Hijack 描述写"吸取敌方主人…HP"(不再写"回复效果减少")',
  /吸取敌方主人 500 HP/.test(cards.slice(nut, nut + 200)) && !/回复效果减少/.test(cards.slice(nut, nut + 200)))

console.log(`\n${fail === 0 ? '✅' : '⚠️'} 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
