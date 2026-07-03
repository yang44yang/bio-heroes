#!/usr/bin/env node
// test-decision-f.mjs — 决策F："描述≠实现" 批的回归守卫
// 5 项：①鲸鲨滤食守护补每回合自愈 ②注射劫持/骨髓造血 i<3→field.length
//       ③PCR 删未实现的标记文案 ④物种大爆发抽2→抽3+文案对齐 ⑤CRISPR ×2 半互换据实描述
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { GUARD_SKILL_NAMES } from '../src/utils/guardSkill.js'
import cards from '../src/data/cards.js'
import spCards from '../src/data/spCards.js'
import eventCards from '../src/data/eventCards.js'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

let pass = 0, fail = 0
const ok = (n, c) => { if (c) pass++; else { fail++; console.error('❌ ' + n) } }

const reg = readFileSync(join(ROOT, 'src/engine/skillRegistry.js'), 'utf8')
const ub = readFileSync(join(ROOT, 'src/hooks/useBattle.js'), 'utf8')
const cardsSrc = readFileSync(join(ROOT, 'src/data/cards.js'), 'utf8')
const spSrc = readFileSync(join(ROOT, 'src/data/spCards.js'), 'utf8')

// ① 鲸鲨·滤食守护：现有每回合自愈（onTurnEnd + passiveAura heal self 1500），且守护仍保留
const ffgStart = reg.indexOf("'Filter-Feed Guard':")
const ffg = ffgStart >= 0 ? reg.slice(ffgStart, ffgStart + 200) : ''
ok('① 鲸鲨 Filter-Feed Guard 补了 onTurnEnd 自愈',
  /timing:\s*'onTurnEnd'/.test(ffg) && /passiveAura/.test(ffg) && /'heal'/.test(ffg) && /'self'/.test(ffg) && /1500/.test(ffg))
ok('① 鲸鲨守护未丢（仍在 GUARD_SKILL_NAMES 白名单）', GUARD_SKILL_NAMES.includes('Filter-Feed Guard'))

// ② 注射劫持 / 骨髓造血：不再 i<3 硬编码；用真 5 格数组(friendlyFieldRaw)找空位
ok('② skillRegistry 不再有 for(i<3) 硬编码', !/i < 3;/.test(reg))
ok('② 召唤类改扫 friendlyField.length（两处）', (reg.match(/i < friendlyField\.length/g) || []).length >= 2)
ok('② 两处用 ctx.friendlyFieldRaw 拿真 5 格数组（避开 onTurnEnd 的过滤数组坑）',
  (reg.match(/ctx\.friendlyFieldRaw \|\| ctx\.friendlyField/g) || []).length >= 2)
ok('② onKill/onTurnEnd 触发点都补了 friendlyFieldRaw', (ub.match(/friendlyFieldRaw:/g) || []).length >= 2)

// ③ PCR·核酸扩增：删掉未实现的"标记"文案，保留真实的 +2000
const pcr = cards.find(c => c.id === 'pcr_machine')
ok('③ PCR 描述不再承诺未实现的标记', pcr && !pcr.skills.some(s => /标记/.test(s.description || '')))
ok('③ PCR 仍保留 +2000 加伤描述', pcr && pcr.skills.some(s => /2000/.test(s.description || '')))

// ④ 物种大爆发：抽 3（不再写死 2）+ 文案不再承诺"过滤入手/回底"
const cam = eventCards.find(c => c.id === 'event_cambrian_explosion')
ok('④ Cambrian 文案与实现一致（不再"放回牌库底"）', cam && !/回底|放回牌库/.test(cam.effectDescription || ''))
ok('④ useBattle draw_filter_nature 用 effectValue、删 simplified 注释',
  /draw_filter_nature[\s\S]{0,260}drawCards\(card\.effectValue/.test(ub) && !/simplified: just draw 2/.test(ub))

// ⑤ CRISPR：两张卡的"互换"文案改成据实（半互换：ATK 变为 HP 值）
const crispr = cards.find(c => c.id === 'crispr_editor')
ok('⑤ CRISPR(卡) 描述据实（不再宣称"互换"）',
  crispr && !crispr.skills.some(s => /互换/.test(s.description || '')) && crispr.skills.some(s => /变为它当前的 HP/.test(s.description || '')))
ok('⑤ cards.js / spCards.js 无残留"ATK 和 HP 互换"文案',
  !/ATK\s*和\s*HP\s*互换|ATK和HP互换/.test(cardsSrc) && !/ATK\s*和\s*HP\s*互换|ATK和HP互换/.test(spSrc))
ok('⑤ SP·基因重写 描述同步改（spCards 无"互换"残留）',
  !spCards.some(c => (c.skills || []).some(s => /互换/.test(s.description || ''))))

console.log(`\n${fail === 0 ? '✅' : '⚠️'} test-decision-f: 通过 ${pass}/${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
