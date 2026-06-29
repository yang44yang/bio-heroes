#!/usr/bin/env node
// R 卡技能描述简洁度守卫（决策6，2026-06-29）
//   决策6：R 卡（最常见、最早接触的入门卡）技能描述应 ≤30 字，7 岁能一眼读懂。
//   曾有 16 张 R 卡描述 >30 字（听诊器 57 字最长），已简化；本测试防回归——
//   新加/改 R 卡时若描述超 30 字会变红，提醒设计者压缩或自觉调阈值。
//   注：SR/SSR 卡机制更复杂，不在此约束内（决策6 只针对入门 R 卡）。
import cards from '../src/data/cards.js'

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }

const LIMIT = 30
const over = []
for (const c of cards) {
  if (c.rarity !== 'R') continue
  for (const s of (c.skills || [])) {
    const len = [...(s.description || '')].length
    if (len > LIMIT) over.push(`${c.name}「${s.name}」${len}字: ${s.description}`)
  }
}
if (over.length) console.error('  超 30 字的 R 卡描述:\n   ' + over.join('\n   '))
ok(`所有 R 卡技能描述 ≤${LIMIT} 字（超标 ${over.length} 张）`, over.length === 0)

// 防"简化时把数值/关键词删没了"——抽查几张：简化后仍须保留各自核心数字
const byId = Object.fromEntries(cards.map(c => [c.id, c]))
const keep = {
  stethoscope_listener: ['1000', '500'],   // 主效果两数值
  bee_worker:           ['500'],            // 中毒/自伤数值
  xray_vision:          ['2000', '守护'],   // 守护卡 + 伤害
  ecoli_thug:           ['50%', '1000'],    // 概率 + 分裂体属性
  stem_cell_morph:      ['R', '50%'],       // 复活同稀有度 + 半血
}
for (const [id, frags] of Object.entries(keep)) {
  const d = byId[id]?.skills?.[0]?.description || ''
  for (const f of frags) ok(`${id} 简化后仍含关键信息「${f}」`, d.includes(f))
}

console.log(`\n${fail === 0 ? '✅' : '⚠️'} 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
