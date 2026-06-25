#!/usr/bin/env node
// 狂犬 Neural Hijack 修复回归测试
// 原"击杀后50%控制对方卡"是无引擎支持的空壳：返回畸形 RUSH_BOOST + 死标记 _neuralHijackActive，
// 还弹"将被控制!"假消息、实际无效果。简化为真效果：onAttack debuff_atk（劫持神经→削弱对手）。
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import cardsRaw from '../src/data/cards.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const cards = cardsRaw.default || cardsRaw
let pass = 0, fail = 0
const ok = (n, c) => { if (c) pass++; else { fail++; console.error(`❌ ${n}`) } }

const reg = readFileSync(join(ROOT, 'src/engine/skillRegistry.js'), 'utf8')
const nh = reg.slice(reg.indexOf("'Neural Hijack'"), reg.indexOf("'Neural Hijack'") + 200)

ok('Neural Hijack 改为 onAttack + onAttackDebuff debuff_atk（真效果）',
  /timing:\s*'onAttack'/.test(nh) && /onAttackDebuff\(ctx,\s*\{\s*effect:\s*'debuff_atk'/.test(nh))
ok('全文不再有死标记 _neuralHijackActive', !/_neuralHijackActive/.test(reg))
ok('全文不再有"将被控制"假消息', !/将被控制/.test(reg))

const rabies = cards.find(c => c.id === 'rabies_virus')
const skill = rabies?.skills?.find(s => s.nameEn === 'Neural Hijack')
ok('狂犬卡存在 + 技能 Neural Hijack', !!skill)
ok('描述不再说"控制"（与新实现一致）', !/控制/.test(skill?.description || ''))
ok('描述提到 ATK 削弱（-1000）', /ATK\s*-\s*1000/.test(skill?.description || ''))
console.log(`  狂犬：${rabies?.name}（${rabies?.atk}/${rabies?.hp}）技能「${skill?.name}」→ ${skill?.description}`)

console.log(`\n${fail === 0 ? '✅' : '⚠️'} 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
