#!/usr/bin/env node
// 守护机制单元测试 + 6 张守护卡数据一致性回归
// 跟 test-sp-gaia 同款：不 import useBattle/BattleScreen(避免 ESM 路径解析)
// 只 import 纯逻辑模块 + 卡数据 + grep 源码确认接线
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

import {
  GUARD_SKILL_NAMES, isGuardSkill, cardHasGuard, fieldHasGuard,
} from '../src/utils/guardSkill.js'
import cards from '../src/data/cards.js'
import spCards from '../src/data/spCards.js'

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }

// ============ 1. isGuardSkill ============
ok('GUARD_SKILL_NAMES 含 Guard + Shell Defense + Physical Barrier',
  ['Guard', 'Shell Defense', 'Physical Barrier'].every(n => GUARD_SKILL_NAMES.includes(n)))
ok('isGuardSkill: Guard 识别', isGuardSkill({ nameEn: 'Guard' }) === true)
ok('isGuardSkill: Shell Defense 识别', isGuardSkill({ nameEn: 'Shell Defense' }) === true)
ok('isGuardSkill: Physical Barrier 识别', isGuardSkill({ nameEn: 'Physical Barrier' }) === true)
ok('isGuardSkill: 其他 nameEn 不识别', isGuardSkill({ nameEn: 'Swift Attack' }) === false)
ok('isGuardSkill: null 守卫', isGuardSkill(null) === false)
ok('isGuardSkill: undefined 守卫', isGuardSkill(undefined) === false)
ok('isGuardSkill: 无 nameEn 字段', isGuardSkill({ name: '守护' }) === false)

// ============ 2. cardHasGuard ============
ok('cardHasGuard: 单守护技能', cardHasGuard({ skills: [{ nameEn: 'Guard' }] }) === true)
ok('cardHasGuard: 多技能含守护', cardHasGuard({ skills: [{ nameEn: 'Swift Attack' }, { nameEn: 'Shell Defense' }] }) === true)
ok('cardHasGuard: 多技能不含守护', cardHasGuard({ skills: [{ nameEn: 'Swift Attack' }, { nameEn: 'Overpower' }] }) === false)
ok('cardHasGuard: 空 skills', cardHasGuard({ skills: [] }) === false)
ok('cardHasGuard: 无 skills 字段', cardHasGuard({}) === false)
ok('cardHasGuard: null 卡', cardHasGuard(null) === false)
ok('cardHasGuard: undefined 卡', cardHasGuard(undefined) === false)

// ============ 3. fieldHasGuard ============
ok('fieldHasGuard: 空数组', fieldHasGuard([]) === false)
ok('fieldHasGuard: 全 null', fieldHasGuard([null, null, null]) === false)
ok('fieldHasGuard: 守护卡 currentHp=0(死了)', fieldHasGuard([{ currentHp: 0, skills: [{ nameEn: 'Guard' }] }]) === false)
ok('fieldHasGuard: 一活守护 + 其他', fieldHasGuard([
  null,
  { currentHp: 100, skills: [{ nameEn: 'Swift Attack' }] },
  { currentHp: 500, skills: [{ nameEn: 'Guard' }] },
]) === true)
ok('fieldHasGuard: 海龟在场也算守护(Shell Defense)', fieldHasGuard([
  { currentHp: 1000, skills: [{ nameEn: 'Shell Defense' }] },
]) === true)
ok('fieldHasGuard: 睫毛在场也算守护(Physical Barrier)', fieldHasGuard([
  { currentHp: 1000, skills: [{ nameEn: 'Physical Barrier' }] },
]) === true)
ok('fieldHasGuard: 非数组 守卫', fieldHasGuard(null) === false && fieldHasGuard(undefined) === false && fieldHasGuard('x') === false)

// ============ 4. 6 张守护卡数据一致性(防未来漂移) ============
const allCards = [...cards, ...spCards]
const findById = (id) => allCards.find(c => c.id === id)

const GUARD_CARD_IDS = [
  { id: 'skin_barrier',          expectedSkillEn: 'Guard' },
  { id: 'skeleton_frame',        expectedSkillEn: 'Guard' },
  { id: 'blue_whale_titan',      expectedSkillEn: 'Guard' },
  { id: 'sp_world_tree',         expectedSkillEn: 'Guard' },
  { id: 'sea_turtle_navigator',  expectedSkillEn: 'Shell Defense' },
  { id: 'eyelash_interceptor',   expectedSkillEn: 'Physical Barrier' },
]

for (const { id, expectedSkillEn } of GUARD_CARD_IDS) {
  const c = findById(id)
  ok(`守护卡 ${id} 存在于数据`, !!c)
  if (!c) continue
  ok(`守护卡 ${id} cardHasGuard === true (统一识别)`, cardHasGuard(c) === true)
  ok(`守护卡 ${id} 技能含 nameEn='${expectedSkillEn}'`,
    c.skills?.some(s => s.nameEn === expectedSkillEn))
}

// ============ 5. 反向断言: 非守护卡不被误识别 ============
for (const id of ['red_blood_cell', 'flu_virus', 'mrna_vaccine', 'cheetah_sprinter']) {
  const c = findById(id)
  ok(`非守护卡 ${id} cardHasGuard === false`, c && cardHasGuard(c) === false)
}

// ============ 6. 接线: 三个调用点都走 helper ============
const ub = readFileSync(join(ROOT, 'src/hooks/useBattle.js'), 'utf8')
const bs = readFileSync(join(ROOT, 'src/components/BattleScreen.jsx'), 'utf8')
const cardJsx = readFileSync(join(ROOT, 'src/components/Card.jsx'), 'utf8')

ok('useBattle import fieldHasGuard + cardHasGuard',
  /import\s*\{\s*cardHasGuard\s*,\s*fieldHasGuard\s*\}\s*from\s*['"]\.\.\/utils\/guardSkill/.test(ub))
ok('useBattle hasGuard 委托给 fieldHasGuard', /const\s+hasGuard\s*=\s*fieldHasGuard/.test(ub))
ok('useBattle isGuardCard 委托给 cardHasGuard', /const\s+isGuardCard\s*=\s*cardHasGuard/.test(ub))
ok('useBattle 已删除内联 nameEn === Guard 硬编码', !/skills\?\.some\(s\s*=>\s*s\.nameEn\s*===\s*['"]Guard['"]\)/.test(ub))

ok('BattleScreen import cardHasGuard',
  /import\s*\{\s*cardHasGuard\s*\}\s*from\s*['"]\.\.\/utils\/guardSkill/.test(bs))
ok('BattleScreen AI 选目标走 pAlive.filter(cardHasGuard)',
  /pAlive\.filter\(cardHasGuard\)/.test(bs))
ok('BattleScreen 已删除内联 nameEn === Guard 硬编码',
  !/c\.skills\?\.some\(s\s*=>\s*s\.nameEn\s*===\s*['"]Guard['"]\)/.test(bs))

ok('Card.jsx import cardHasGuard',
  /import\s*\{\s*cardHasGuard\s*\}\s*from\s*['"]\.\.\/utils\/guardSkill/.test(cardJsx))
ok('Card.jsx 视效条件含 cardHasGuard(card)', /cardHasGuard\(card\)/.test(cardJsx))
ok('Card.jsx 视效含"守护中"文字', /守护中/.test(cardJsx))
ok('Card.jsx 视效含 🛡️ emoji', /🛡️/.test(cardJsx))
ok('Card.jsx 视效仅活体显示(!isDead 守卫)', /!isDead\s*&&\s*cardHasGuard/.test(cardJsx))

console.log(`\n${fail === 0 ? '✅' : '⚠️'} 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
