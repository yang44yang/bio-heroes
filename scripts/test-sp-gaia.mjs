#!/usr/bin/env node
// sp_gaia_restoration 接线完整性校验：spCards 数据 / App SP_UNLOCK_MAP / skillRegistry 三处一致
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

import spCards from '../src/data/spCards.js'

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }

// ---- 1. spCards 里存在 sp_gaia_restoration ----
const card = spCards.find(c => c.id === 'sp_gaia_restoration')
ok('spCards: sp_gaia_restoration 存在', !!card)

if (card) {
  ok('id 正确', card.id === 'sp_gaia_restoration')
  ok('unlockMode === campaign_only', card.unlockMode === 'campaign_only')
  ok('unlockStage === stage_3_8', card.unlockStage === 'stage_3_8')
  ok('faction === nature', card.faction === 'nature')
  ok('rarity === SSR', card.rarity === 'SSR')
  ok('type === sp', card.type === 'sp')
  ok('spCost === 8', card.spCost === 8)
  ok('atk = 6000 (500 倍数)', card.atk === 6000 && card.atk % 500 === 0)
  ok('hp = 20000 (500 倍数)', card.hp === 20000 && card.hp % 500 === 0)
  ok(`ATK+HP=26000 在 spCost 8 上限 30000 内`, card.atk + card.hp <= 30000)
  ok('factionRequirement === null', card.factionRequirement === null)
  // 技能结构
  ok('有 2 个技能', Array.isArray(card.skills) && card.skills.length === 2)
  const s0 = card.skills[0], s1 = card.skills[1]
  ok('skill[0] = Rewilding (onPlay)', s0?.nameEn === 'Rewilding' && s0?.timing === 'onPlay' && s0?.type === 'unique')
  ok('skill[1] = Photosynthetic Nourishment (onTurnEnd)', s1?.nameEn === 'Photosynthetic Nourishment' && s1?.timing === 'onTurnEnd')
  ok('scienceCard 非空且含"重引入/灰狼/海獭"中至少一个', /灰狼|海獭|重引入|生态/.test(card.scienceCard || ''))
  ok('scienceNote 含真实案例(黄石 1995/14只狼)', /黄石|1995|14/.test(s0?.scienceNote || ''))
}

// ---- 2. App.jsx SP_UNLOCK_MAP 含 stage_3_8 -> sp_gaia_restoration ----
const appJsx = readFileSync(join(ROOT, 'src/App.jsx'), 'utf8')
ok('App.jsx: stage_3_8 已挂入 SP_UNLOCK_MAP', /'stage_3_8'\s*:\s*'sp_gaia_restoration'/.test(appJsx))
ok('App.jsx: stage_2_8 仍指 sp_vaccine_shield', /'stage_2_8'\s*:\s*'sp_vaccine_shield'/.test(appJsx))
ok('App.jsx: stage_4_8 仍指 sp_quantum_healer', /'stage_4_8'\s*:\s*'sp_quantum_healer'/.test(appJsx))

// ---- 3. skillRegistry.js 有两个技能注册 ----
const reg = readFileSync(join(ROOT, 'src/engine/skillRegistry.js'), 'utf8')
ok("skillRegistry: 'Rewilding' 已注册", /'Rewilding'\s*:\s*\{/.test(reg))
ok("skillRegistry: 'Photosynthetic Nourishment' 已注册", /'Photosynthetic Nourishment'\s*:\s*\{/.test(reg))
// 技能内部检查：Rewilding 发 HEAL_LEADER 5000 + MASS_REVIVE nature 50%
const rwIdx = reg.indexOf("'Rewilding'")
const photoIdx = reg.indexOf("'Photosynthetic Nourishment'")
const rwBody = reg.slice(rwIdx, rwIdx + 800)
const photoBody = reg.slice(photoIdx, photoIdx + 300)
ok('Rewilding 含 HEAL_LEADER amount: 5000', /HEAL_LEADER[\s\S]*amount:\s*5000/.test(rwBody))
ok('Rewilding 含 MASS_REVIVE + faction_filter nature', /MASS_REVIVE[\s\S]*faction_filter:\s*'nature'/.test(rwBody))
ok('Rewilding 含 hp_percent 0.5', /hp_percent:\s*0\.5/.test(rwBody))
ok('Rewilding 含 emptyMessage 防空响', /emptyMessage/.test(rwBody))
ok('Photosynthetic Nourishment 用 passiveHeal scope:leader amount:1500',
  /passiveHeal[\s\S]*scope:\s*'leader'[\s\S]*amount:\s*1500/.test(photoBody))

// ---- 4. useBattle.js MASS_REVIVE 加了 faction_filter 支持 ----
const ub = readFileSync(join(ROOT, 'src/hooks/useBattle.js'), 'utf8')
ok('useBattle.js: MASS_REVIVE 支持 evt.faction_filter', /MASS_REVIVE[\s\S]{0,800}evt\.faction_filter/.test(ub))
ok('useBattle.js: faction_filter 时按 faction 过滤', /chars\.filter\(c\s*=>\s*c\.faction\s*===\s*evt\.faction_filter\)/.test(ub))
ok('useBattle.js: 空 chars 时支持 emptyMessage', /emptyMessage/.test(ub))

// ---- 5. 向后兼容：sp_quantum_healer 仍能跑 MASS_REVIVE(不传 faction_filter) ----
const quantumIdx = reg.indexOf("'Quantum Repair'")
const quantumBody = reg.slice(quantumIdx, quantumIdx + 600)
ok('Quantum Repair 仍发 MASS_REVIVE (不传 faction_filter, 向后兼容)',
  /MASS_REVIVE/.test(quantumBody) && !/Quantum[\s\S]{0,400}faction_filter/.test(quantumBody))

console.log(`\n${fail === 0 ? '✅' : '⚠️'} 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
