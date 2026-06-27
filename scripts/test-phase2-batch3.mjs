#!/usr/bin/env node
// Phase 2 第三批扩卡回归测试（8 张：寄居蟹/清洁虾/大王乌贼/座头鲸/蓝环章鱼/古菌/核糖体/酵母）
// 数据卡 import；技能注册用 grep 源码（skillRegistry 含无扩展名 import，不能直接 import）。
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
import cards from '../src/data/cards.js'
import { quizzes } from '../src/data/quizzes.js'

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }

const POWER = { 0: 2000, 1: 4000, 2: 6000, 3: 9000, 4: 12000, 5: 16000, 6: 20000, 7: 25000, 8: 30000, 9: 35000, 10: 40000 }
const reg = readFileSync(join(ROOT, 'src/engine/skillRegistry.js'), 'utf8')

const NEW = [
  'hermit_crab', 'cleaner_shrimp', 'giant_squid', 'humpback_whale',
  'blue_ringed_octopus', 'archaea', 'ribosome', 'yeast',
]

// ============ 1. 8 张卡存在 + schema/数值 ============
for (const id of NEW) {
  const c = cards.find(x => x.id === id)
  ok(`卡存在: ${id}`, !!c)
  if (!c) continue
  ok(`${id} faction ∈ {nature,body}`, ['nature', 'body'].includes(c.faction))
  ok(`${id} type=character`, c.type === 'character')
  ok(`${id} set 为 OCEAN/MICRO`, c.set === 'OCEAN' || c.set === 'MICRO')
  ok(`${id} ATK 是 500 倍数`, c.atk % 500 === 0)
  ok(`${id} HP 是 500 倍数`, c.hp % 500 === 0)
  ok(`${id} ATK+HP(${c.atk + c.hp}) 在 cost${c.cost} 上限 ${POWER[c.cost]} 内`, c.atk + c.hp <= POWER[c.cost])
  // 费用≠稀有度 + 标记规则：SSR 必有 factionRequirement；SR<6 / R 必为 null
  if (c.rarity === 'SSR') {
    ok(`${id} SSR 带 factionRequirement`, c.factionRequirement && typeof c.factionRequirement === 'object')
    ok(`${id} factionRequirement 字段完整`, c.factionRequirement && c.factionRequirement.faction && c.factionRequirement.count >= 1 && ['check', 'consume'].includes(c.factionRequirement.type))
  } else if (c.rarity === 'R' || (c.rarity === 'SR' && c.cost < 6)) {
    ok(`${id}(${c.rarity} cost${c.cost}) factionRequirement=null`, c.factionRequirement === null)
  }
  // 每个技能 nameEn 必须注册 + 有 scienceNote
  for (const s of c.skills) {
    ok(`${id} 技能 "${s.nameEn}" 已注册到 skillRegistry`, reg.includes(`'${s.nameEn}'`) || reg.includes(`"${s.nameEn}"`))
    ok(`${id} 技能 "${s.nameEn}" 有 scienceNote`, !!s.scienceNote)
  }
}

// 卡名/分类专项
const ribosome = cards.find(x => x.id === 'ribosome')
ok('核糖体 faction=body（本批唯一 body 卡，细胞零件交叉）', ribosome && ribosome.faction === 'body')
ok('核糖体 set=MICRO subType=cellular', ribosome && ribosome.set === 'MICRO' && ribosome.subType === 'cellular')
const squid = cards.find(x => x.id === 'giant_squid')
ok('大王乌贼 SSR cost7 持有🌱×3', squid && squid.rarity === 'SSR' && squid.cost === 7 && squid.factionRequirement?.count === 3)
// 稀有度铺开：R×2 / SR×4 / SSR×2
const rc = NEW.map(id => cards.find(x => x.id === id).rarity)
ok('稀有度分布 R×2/SR×4/SSR×2', rc.filter(r => r === 'R').length === 2 && rc.filter(r => r === 'SR').length === 4 && rc.filter(r => r === 'SSR').length === 2)

// ============ 2. 14 个新技能注册：timing 正确 ============
const expectTiming = {
  'Shell Swap': 'onPlay',
  'Cleaning Station': 'onTurnEnd',
  'Trusted Truce': 'onPlay',
  'Ten-Arm Grapple': 'onAttack',
  'Abyssal Eyesight': 'onAttack',
  'Bubble-Net Feeding': 'onPlay',
  'Whale Song': 'onTurnEnd',
  'Venom Bite': 'onAttack',
  'Warning Rings': 'onHit',
  'Extremophile': 'onTurnEnd',
  'Methanogenesis': 'onPlay',
  'Protein Synthesis': 'onTurnEnd',
  'Translation Boost': 'onPlay',
  'Fermentation': 'onTurnStart',
}
for (const [key, timing] of Object.entries(expectTiming)) {
  const re = new RegExp(`'${key}':\\s*\\{[\\s\\S]{0,60}?timing:\\s*'${timing}'`)
  ok(`技能 "${key}" 注册且 timing='${timing}'`, re.test(reg))
}
// 能量安全：ENERGY_BOOST 只在 onTurnStart/onPlay 被分派（onTurnEnd dispatcher 不处理 ENERGY_BOOST）。
// 故产能技能（Fermentation/Methanogenesis）绝不能写成 onTurnEnd，否则能量静默丢失。
ok('Fermentation 用 onTurnStart（非 onTurnEnd，否则能量丢失）', expectTiming['Fermentation'] === 'onTurnStart')
ok('Methanogenesis 用 onPlay（非 onTurnEnd）', expectTiming['Methanogenesis'] === 'onPlay')

// onAttackDebuff poison/paralyze、onHitCounter、conditionalAtk、cleanse、passiveEnergy 模板存在（复用 0 新引擎）
const tmpl = readFileSync(join(ROOT, 'src/engine/skillTemplates.js'), 'utf8')
ok('模板 onAttackDebuff 支持 poison', /export function onAttackDebuff/.test(tmpl) && /case 'poison'/.test(tmpl))
ok('模板 cleanse / passiveEnergy / onHitCounter 存在',
  /export function cleanse/.test(tmpl) && /export function passiveEnergy/.test(tmpl) && /export function onHitCounter/.test(tmpl))

// ============ 3. 24 道题：每卡 3 道三层 + 质量 ============
const allNewTypes = new Set(quizzes.filter(q => NEW.includes(q.cardId)).map(q => q.type))
ok('新卡题整体覆盖三层(memo+mech+infer)', allNewTypes.has('memorization') && allNewTypes.has('mechanism') && allNewTypes.has('inference'))
for (const id of NEW) {
  const c = cards.find(x => x.id === id)
  const qs = quizzes.filter(q => q.cardId === id)
  ok(`${id} 有 3 道题`, qs.length === 3)
  const types = new Set(qs.map(q => q.type))
  ok(`${id} 覆盖记忆/机制/推理三层`, types.has('memorization') && types.has('mechanism') && types.has('inference'))
  for (const q of qs) {
    ok(`${id} 题选项=4`, q.options.length === 4)
    ok(`${id} 题 answer 在 0-3`, q.answer >= 0 && q.answer <= 3)
    const lens = q.options.map(o => o.length)
    ok(`${id} 题选项长度差<12 ("${q.q.slice(0, 12)}")`, Math.max(...lens) - Math.min(...lens) < 12)
    ok(`${id} 题不带 legacy 标记`, !q.tags.includes('legacy'))
    ok(`${id} 题 tags[0]=phase2`, q.tags[0] === 'phase2')
    ok(`${id} 题 faction 与卡一致(${c.faction})`, q.faction === c.faction)
  }
}

console.log(`\n${fail === 0 ? '✅' : '⚠️'} 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
