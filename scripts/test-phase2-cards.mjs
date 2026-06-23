#!/usr/bin/env node
// Phase 2 能量主线扩卡回归测试（深海管虫/蓝细菌/叶绿体/眼虫）
// 数据卡用 import；技能注册用 grep 源码文本断言（skillRegistry 含无扩展名 import，不能直接 import）
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
  'tube_worm_vent', 'cyanobacteria_oxygen', 'chloroplast_solar_forge', 'euglena',
  'anglerfish', 'sperm_whale', 'clownfish_anemone', 'sea_star',
  'emperor_penguin', 'slime_mold', 'diatom', 'tardigrade',
]

// ============ 1. 4 张卡存在 + schema/数值 ============
for (const id of NEW) {
  const c = cards.find(x => x.id === id)
  ok(`卡存在: ${id}`, !!c)
  if (!c) continue
  ok(`${id} faction=nature`, c.faction === 'nature')
  ok(`${id} type=character`, c.type === 'character')
  ok(`${id} set 为 OCEAN/MICRO`, c.set === 'OCEAN' || c.set === 'MICRO')
  ok(`${id} ATK 是 500 倍数`, c.atk % 500 === 0)
  ok(`${id} HP 是 500 倍数`, c.hp % 500 === 0)
  ok(`${id} ATK+HP(${c.atk + c.hp}) 在 cost${c.cost} 上限 ${POWER[c.cost]} 内`, c.atk + c.hp <= POWER[c.cost])
  // SSR 必须有 factionRequirement
  if (c.rarity === 'SSR') {
    ok(`${id} SSR 带 factionRequirement`, c.factionRequirement && typeof c.factionRequirement === 'object')
    ok(`${id} factionRequirement 字段完整`, c.factionRequirement && c.factionRequirement.faction && c.factionRequirement.count >= 1 && ['check', 'consume'].includes(c.factionRequirement.type))
  }
  // 每个技能 nameEn 必须注册在 skillRegistry
  for (const s of c.skills) {
    ok(`${id} 技能 "${s.nameEn}" 已注册到 skillRegistry`, reg.includes(`'${s.nameEn}'`) || reg.includes(`"${s.nameEn}"`))
    ok(`${id} 技能 "${s.nameEn}" 有 scienceNote`, !!s.scienceNote)
  }
}

// 覆盖性：tube worm 是 invertebrate_other（不是误标的 microbe），名字是 Yang 批准版
const tw = cards.find(x => x.id === 'tube_worm_vent')
ok('深海管虫 subType=invertebrate_other(2米环节动物，非microbe)', tw && tw.subType === 'invertebrate_other')
ok('深海管虫 名字=热泉炼金师(Yang 批准版，与 nameEn Alchemist 一致)', tw && tw.name.includes('热泉炼金师'))

// 全局：12 张新卡的题整体覆盖记忆/机制/推理三层
const allNewTypes = new Set(quizzes.filter(q => NEW.includes(q.cardId)).map(q => q.type))
ok('新卡题整体覆盖三层(memo+mech+infer)', allNewTypes.has('memorization') && allNewTypes.has('mechanism') && allNewTypes.has('inference'))

// ============ 2. 7 个新技能注册：timing 正确 ============
const expectTiming = {
  'Chemosynthetic Bounty': 'onTurnEnd',
  'Great Oxidation Event': 'onPlay',
  'Oxygenic Photosynthesis': 'onTurnEnd',
  'Photosynthesis Burst': 'onPlay',
  'Sugar Provision': 'onTurnEnd',
  'Photosynthesis Recovery': 'onTurnEnd',
  'Engulf Mode': 'onAttack',
}
for (const [key, timing] of Object.entries(expectTiming)) {
  // 断言 'key': { timing: 'xxx' 紧随注册
  const re = new RegExp(`'${key}':\\s*\\{[\\s\\S]{0,40}?timing:\\s*'${timing}'`)
  ok(`技能 "${key}" 注册且 timing='${timing}'`, re.test(reg))
}
// onTurnStart 不再是死 handler（本会话 df38569 已接通玩家回合开始钩子）。
// slime_mold「Trial and Error」用 onTurnStart，断言其依赖的 processTurnStartEffects 触发点存在，确保不是哑技能。
const ub = readFileSync(join(ROOT, 'src/hooks/useBattle.js'), 'utf8')
ok('onTurnStart 已接通(useBattle triggerSkills onTurnStart) — Trial and Error 非死技能',
  /triggerSkills\(\s*['"]onTurnStart['"]/.test(ub))

// ============ 3. 12 道题：每卡 3 道三层 + 质量 ============
for (const id of NEW) {
  const qs = quizzes.filter(q => q.cardId === id)
  ok(`${id} 有 3 道题`, qs.length === 3)
  const types = new Set(qs.map(q => q.type))
  // 每卡至少 2 种认知层次（个别卡如安康鱼为 memo/mech/mech，为 kid7+准确性主动舍弃 inference）
  ok(`${id} 至少覆盖 2 个认知层次`, types.size >= 2)
  for (const q of qs) {
    ok(`${id} 题选项=4`, q.options.length === 4)
    ok(`${id} 题 answer 在 0-3`, q.answer >= 0 && q.answer <= 3)
    const lens = q.options.map(o => o.length)
    ok(`${id} 题选项长度差<12 ("${q.q.slice(0, 12)}")`, Math.max(...lens) - Math.min(...lens) < 12)
    ok(`${id} 题不带 legacy 标记`, !q.tags.includes('legacy'))
    ok(`${id} 题 tags[0]=ch3(nature)`, q.tags[0] === 'ch3')
    ok(`${id} 题 faction=nature`, q.faction === 'nature')
  }
}

console.log(`\n${fail === 0 ? '✅' : '⚠️'} 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
