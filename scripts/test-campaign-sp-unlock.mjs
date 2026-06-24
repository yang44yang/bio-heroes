#!/usr/bin/env node
// campaign SP 通关解锁 bug 修复回归测试
//
// bug：unlockCampaignSP 解锁时只 push unlockedSPs、从不写 collection；而 DeckBuilder 的 SP 池 /
// 图鉴的拥有判定都只读 collection → 通关 boss 解锁的 3 张 SP（盖娅复苏 / 疫苗之盾 / 量子医疗）
// 永远进不了卡组（解锁=空欢喜）。tech 两张大 SP 不可用即源于此。
// 修：① unlockCampaignSP 同时写 collection（stateRef 同步防覆盖）② loadEconomy 回填老存档。
// grep 源码接线 + import 纯数据（不 import hook，避 ESM/React）。
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import spCardsRaw from '../src/data/spCards.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const spCards = spCardsRaw.default || spCardsRaw
let pass = 0, fail = 0
const ok = (n, c) => { if (c) pass++; else { fail++; console.error(`❌ ${n}`) } }

const eco = readFileSync(join(ROOT, 'src/hooks/useEconomy.js'), 'utf8')
const app = readFileSync(join(ROOT, 'src/App.jsx'), 'utf8')

// ---- ① unlockCampaignSP 写 collection + stateRef 同步 ----
const fnStart = eco.indexOf('const unlockCampaignSP')
const fn = eco.slice(fnStart, eco.indexOf('}, [])', fnStart) + 6) // 仅 unlockCampaignSP 自身（到它的闭合）
ok('① unlockCampaignSP 把 SP 写入 collection（不再只 push unlockedSPs）',
  /collection:\s*\{\s*\.\.\.prev\.collection,\s*\[spId\]/.test(fn))
ok('① unlockCampaignSP 用 stateRef 同步模式（const prev = stateRef.current + stateRef.current = next）',
  /const prev = stateRef\.current/.test(fn) && /stateRef\.current = next/.test(fn))
ok('① unlockCampaignSP 不再用函数式 setState(prev=>...)（那样会被后续覆盖式写回覆盖）',
  !/setState\(prev =>/.test(fn))
ok('① unlockCampaignSP 仍幂等（已解锁直接 return）', /includes\(spId\)\)\s*return/.test(fn))

// ---- ② loadEconomy 回填老存档 ----
const load = eco.slice(eco.indexOf('function loadEconomy'), eco.indexOf('function loadEconomy') + 1000)
ok('② loadEconomy 遍历 unlockedSPs 回填 collection',
  /for \(const id of st\.unlockedSPs/.test(load) && /st\.collection\[id\] = 1/.test(load))

// ---- ③ 数据一致性：每张 campaign_only SP 都有通关解锁入口（SP_UNLOCK_MAP），且 unlockStage 一致 ----
const campaignSp = spCards.filter(s => s.unlockMode === 'campaign_only')
ok('③ 存在 campaign_only SP（数据前提）', campaignSp.length > 0)
const mapBlock = app.slice(app.indexOf('SP_UNLOCK_MAP'), app.indexOf('SP_UNLOCK_MAP') + 500)
const entries = [...mapBlock.matchAll(/['"]([^'"]+)['"]:\s*['"](sp_[^'"]+)['"]/g)].map(m => ({ stage: m[1], sp: m[2] }))
const stageBySp = Object.fromEntries(entries.map(e => [e.sp, e.stage]))
for (const sp of campaignSp) {
  ok(`③ ${sp.name} 在 SP_UNLOCK_MAP 有通关解锁入口`, !!stageBySp[sp.id])
  ok(`③ ${sp.name} 的 unlockStage 与 SP_UNLOCK_MAP key 一致`, sp.unlockStage === stageBySp[sp.id])
}
console.log(`  campaign_only SP（${campaignSp.length}张）：${campaignSp.map(s => `${s.name}[${s.faction}/${s.unlockStage}]`).join('、')}`)

console.log(`\n${fail === 0 ? '✅' : '⚠️'} 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
