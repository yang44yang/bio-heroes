#!/usr/bin/env node
// 引擎"描述≠实现"小尾巴 — 防退回测试（2026-06-28）
//   ① 蓝鲸 声纳震荡：卡面文案与代码同为 3000（曾文案 2000 / 代码 3000 不符）。
//   ② 炭疽孢子 孢子休眠：齐齐定"必定复活·每场一次（像海星）"——
//      代码用 onDeathEffect chance_revive(chance:1.0)，删掉原 bespoke "Math.random()>0.5 立即50%复活"；
//      卡面文案改"必定复活"、不再写"2 回合后"。
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
import cards from '../src/data/cards.js'

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }

const reg = readFileSync(join(ROOT, 'src/engine/skillRegistry.js'), 'utf8')
const findSkill = (cardId, nameEn) =>
  cards.find(c => c.id === cardId)?.skills.find(s => s.nameEn === nameEn)

// ===== ① 蓝鲸 Sonar Shockwave 3000（文案=代码） =====
const sonar = findSkill('blue_whale_titan', 'Sonar Shockwave')
ok('蓝鲸 声纳震荡 卡面文案含 3000', !!sonar && sonar.description.includes('3000'))
ok('蓝鲸 声纳震荡 卡面文案不再写 2000', !!sonar && !sonar.description.includes('2000'))
ok('蓝鲸 Sonar Shockwave 代码 amount: 3000',
  /'Sonar Shockwave':[\s\S]{0,120}?amount:\s*3000/.test(reg))

// ===== ② 炭疽孢子 Spore Dormancy 必定复活·每场一次 =====
const spore = findSkill('anthrax_spore', 'Spore Dormancy')
ok('炭疽孢子 孢子休眠 文案含"必定"', !!spore && spore.description.includes('必定'))
ok('炭疽孢子 孢子休眠 文案不再写"2 回合后"', !!spore && !spore.description.includes('2 回合后'))
ok('炭疽孢子 孢子休眠 文案标注"每场限一次"', !!spore && spore.description.includes('每场限一次'))
// 代码：用 onDeathEffect chance_revive(chance:1.0)，且删掉了原 bespoke 50% 随机
const sporeBlock = reg.slice(reg.indexOf("'Spore Dormancy'"), reg.indexOf("'Spore Dormancy'") + 400)
ok('Spore Dormancy 用 onDeathEffect chance_revive', /onDeathEffect\([\s\S]*?chance_revive/.test(sporeBlock))
ok('Spore Dormancy chance: 1.0（必定）', /chance:\s*1\.0/.test(sporeBlock))
ok('Spore Dormancy revive_hp: 6000（满血）', /revive_hp:\s*6000/.test(sporeBlock))
ok('Spore Dormancy 已删除 bespoke "Math.random() > 0.5"', !/Math\.random\(\)\s*>\s*0\.5/.test(sporeBlock))

// 模板保证"每场一次"：chance_revive 复活体一律 skills:[] → 不再触发 onDeath → 无限链被掐断
const tmpl = readFileSync(join(ROOT, 'src/engine/skillTemplates.js'), 'utf8')
ok('onDeathEffect chance_revive 复活体 skills:[]（保证每场一次，无限复活链被切断）',
  /case 'chance_revive'[\s\S]*?skills:\s*\[\]/.test(tmpl))

console.log(`\n${fail === 0 ? '✅' : '⚠️'} 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
