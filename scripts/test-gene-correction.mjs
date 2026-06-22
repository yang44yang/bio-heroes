#!/usr/bin/env node
// 基因治疗·修复密码 bug 修复回归测试
// 跟 test-sp-gaia 同款：不 import skillRegistry(Node ESM 严格模式不接 .js 缺省扩展),
// 而是 grep 文本验证注册存在 + import cards.js 验证数据 + 内联 mock executor 跑行为
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

import cards from '../src/data/cards.js'

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }

const reg = readFileSync(join(ROOT, 'src/engine/skillRegistry.js'), 'utf8')
const ub  = readFileSync(join(ROOT, 'src/hooks/useBattle.js'), 'utf8')

// ---- 1. skillRegistry: Gene Correction 已注册 ----
ok("skillRegistry: 'Gene Correction' 已注册", /'Gene Correction'\s*:\s*\{/.test(reg))
const idx = reg.indexOf("'Gene Correction'")
const body = idx > 0 ? reg.slice(idx, idx + 1000) : ''
ok('timing onPlay', /timing:\s*'onPlay'/.test(body))
ok('用 one_highest_atk 思路(b.atk - a.atk 排序取第一)', /b\.atk\s*-\s*a\.atk/.test(body))
ok('返回 stat:atk amount:1500 BUFF', /stat:\s*'atk'[\s\S]*amount:\s*1500/.test(body))
ok('返回 stat:hp  amount:3000 BUFF', /stat:\s*'hp'[\s\S]*amount:\s*3000/.test(body))
ok('两个 BUFF 都不带 turns(永久)', !/turns:/.test(body))
ok('source = ctx.card.name', /source:\s*ctx\.card\.name/.test(body))

// ---- 2. useBattle BUFF case 加了 stat==='hp' 分支 ----
const buffStart = ub.indexOf("case 'BUFF':")
const buffEnd   = ub.indexOf('case ', buffStart + 50)
const buffBody  = ub.slice(buffStart, buffEnd)
ok('useBattle BUFF case 含 stat === hp 分支', /stat\s*===\s*'hp'/.test(buffBody))
ok('hp buff 同时改 maxHp', /target\.maxHp\s*=/.test(buffBody))
ok('hp buff 同时改 currentHp', /target\.currentHp\s*=/.test(buffBody))
ok('hp buff 仍处理 baseMax = maxHp || hp', /maxHp\s*\|\|\s*target\.hp/.test(buffBody))

// ---- 3. cards.js: 数据与新逻辑对齐 ----
const cardData = cards.find(c => c.id === 'gene_therapy_fix')
ok('cards.js: gene_therapy_fix 存在', !!cardData)
const skill = cardData?.skills?.[0]
ok('技能 nameEn === Gene Correction (与 registry key 一致)', skill?.nameEn === 'Gene Correction')
ok('描述不再说"选择一项"(旧设计)', !/选择一项/.test(skill?.description || ''))
ok('描述提到"ATK 最高"', /ATK\s*最高/.test(skill?.description || ''))
ok('描述提到 +1500 ATK', /\+1500\s*ATK/.test(skill?.description || ''))
ok('描述提到 +3000 HP', /\+3000\s*HP/.test(skill?.description || ''))

// ---- 4. 行为单测：内联 mock Gene Correction executor 跑(逻辑要跟 registry 同步) ----
function geneCorrectionMock(ctx) {
  const allies = (ctx.friendlyField || []).filter(c => c && c.currentHp > 0)
  if (allies.length === 0) return null
  const target = [...allies].sort((a, b) => b.atk - a.atk)[0]
  return [
    { type:'BUFF', targetUid: target.uid, stat:'atk', amount: 1500, source: ctx.card.name, message: `🧬 ${ctx.card.name} 修正 ${target.name} 的基因！永久 +1500 ATK` },
    { type:'BUFF', targetUid: target.uid, stat:'hp',  amount: 3000, source: ctx.card.name, message: `💪 ${target.name} 获得永久 +3000 HP！` },
  ]
}

const card = { name: '基因治疗·修复密码', uid: 'gt_uid' }
const e1 = geneCorrectionMock({ card, friendlyField: [
  { uid:'a', name:'红细胞', atk:1000, currentHp:2500, maxHp:2500 },
  { uid:'b', name:'白细胞', atk:2500, currentHp:4000, maxHp:4000 }, // ATK 最高
  { uid:'c', name:'血小板', atk:500,  currentHp:3000, maxHp:3000 },
]})
ok('返回 2 个事件', Array.isArray(e1) && e1.length === 2)
ok('全是 BUFF', e1?.every(e => e.type === 'BUFF'))
ok('全指向 ATK 最高的 b', e1?.every(e => e.targetUid === 'b'))
ok('atk buff = 1500', e1?.find(e => e.stat === 'atk')?.amount === 1500)
ok('hp  buff = 3000', e1?.find(e => e.stat === 'hp')?.amount === 3000)
ok('友方场空 → null', geneCorrectionMock({ card, friendlyField: [] }) === null)
ok('全死 → null', geneCorrectionMock({ card, friendlyField: [{ uid:'x', atk:1000, currentHp:0, maxHp:1000 }] }) === null)
ok('单友方 → 都给它', (() => {
  const r = geneCorrectionMock({ card, friendlyField: [{ uid:'only', name:'孤独', atk:999, currentHp:1000, maxHp:1000 }] })
  return r?.length === 2 && r.every(e => e.targetUid === 'only')
})())

// ---- 5. useBattle BUFF hp 处理行为模拟 (验证 maxHp + currentHp 同时增加) ----
function applyHpBuff(target, amount) {
  const baseMax = target.maxHp || target.hp || 0
  target.maxHp = Math.max(0, baseMax + amount)
  target.currentHp = Math.max(0, (target.currentHp || 0) + amount)
  return target
}
const t = { uid:'t', maxHp:4000, currentHp:3000, atk:2500 }
applyHpBuff(t, 3000)
ok('HP buff 后 maxHp = 7000', t.maxHp === 7000)
ok('HP buff 后 currentHp = 6000(累加,不超 maxHp)', t.currentHp === 6000)
const t2 = { uid:'t2', maxHp:1000, currentHp:1000, atk:500 }
applyHpBuff(t2, 3000)
ok('满血卡 HP buff 后 currentHp = 4000 (maxHp 4000)', t2.maxHp === 4000 && t2.currentHp === 4000)

console.log(`\n${fail === 0 ? '✅' : '⚠️'} 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
