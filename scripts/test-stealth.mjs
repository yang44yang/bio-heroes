#!/usr/bin/env node
// 隐身(stealth) bug 回归测试（齐齐实测：变色龙顶着 5499 护盾几乎打不死）
//
// bug：变色龙「色彩伪装/Color Camouflage」被实现成 9999 点护盾"近似隐身"，导致几乎无敌；
//      _stealth 标记是死代码；且真 stealth 状态只被玩家攻击选靶尊重(843)、AI 选靶(561)不尊重 → 单向。
// 修：① Color Camouflage 改用真 stealth status(mirror 抹香鲸 Abyssal Dive)；② AI 选靶也过滤 stealth。
// grep 源码接线 + import 纯数据。
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import cardsRaw from '../src/data/cards.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const cards = cardsRaw.default || cardsRaw
let pass = 0, fail = 0
const ok = (n, c) => { if (c) pass++; else { fail++; console.error(`❌ ${n}`) } }

const reg = readFileSync(join(ROOT, 'src/engine/skillRegistry.js'), 'utf8')
const bs = readFileSync(join(ROOT, 'src/components/BattleScreen.jsx'), 'utf8')

// ---- ① Color Camouflage 改真隐身 ----
const cc = reg.slice(reg.indexOf("'Color Camouflage'"), reg.indexOf("'Color Camouflage'") + 600)
ok('① Color Camouflage 用 APPLY_STATUS + stealth 状态（不再 APPLY_SHIELD）',
  /type:\s*'APPLY_STATUS'/.test(cc) && /type:\s*'stealth',\s*turnsLeft:\s*1/.test(cc))
ok('① Color Camouflage 不再用 9999 护盾近似隐身', !/9999/.test(cc) && !/APPLY_SHIELD/.test(cc))
ok('① 死代码 _stealth 标记已移除', !/_stealth/.test(cc))

// ---- ② 选靶两条路径都尊重 stealth ----
const stealthHits = (bs.match(/!c\.statuses\?\.some\(s => s\.type === 'stealth'\)/g) || []).length
ok('② stealth 过滤出现 2 次（AI 的 pFieldNow + 玩家的 enemyField）', stealthHits >= 2)
ok('② AI 攻击选靶(pAlive/pFieldNow)含 stealth 过滤', /pAlive[\s\S]{0,140}stealth/.test(bs))
ok('② 玩家攻击选靶(enemyField)含 stealth 过滤（未回归）', /enemyField\.map[\s\S]{0,140}stealth/.test(bs))

// ---- ③ 正解参照仍在（抹香鲸 Abyssal Dive 用真 stealth）----
ok('③ 抹香鲸 Abyssal Dive 仍用真 stealth status（正解参照）',
  /'Abyssal Dive'[\s\S]{0,400}type:\s*'stealth',\s*turnsLeft:\s*1/.test(reg))

// ---- 数据：变色龙技能名是 Color Camouflage ----
const chameleon = cards.find(c => c.id === 'chameleon_stealth')
ok('数据：变色龙技能为 Color Camouflage', chameleon?.skills?.[0]?.nameEn === 'Color Camouflage')
console.log(`  变色龙：${chameleon?.name}（${chameleon?.atk}/${chameleon?.hp}，技能「${chameleon?.skills?.[0]?.name}」）`)

console.log(`\n${fail === 0 ? '✅' : '⚠️'} 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
