#!/usr/bin/env node
// 「新玩家第一次点进卡组界面」守卫（2026-08-22）
//
// 背景（实测，不是观感）：首页重构完之后，新玩家点「⚔️ 自由对战」落到的卡组界面还是老样子 ——
//   · **10 个一模一样的「空卡组 ➕ 新建」**铺满整屏，没有任何信息量；
//   · 唯一能立刻开打的入口是页面最底下 **12px 的灰字**「使用默认测试卡组开始战斗」
//     （iPad 竖屏在 y=912 贴着屏幕底边，手机竖屏还要往下滚 116px 才看得见）；
//   · 一键组卡的「推荐」是 **10px** 的按钮，而且藏在「➕ 新建」之后。
//   对 7 岁的玩家，这等于「首页干净了，第一扇门还是墙」。
//
// 本守卫钉死这扇门的形状，不是像素：**没有卡组时必须有一条一眼可见的「马上能玩」的路**，
// 而且这条路不许把人卡住（卡不够就退回默认卡组）。

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }
const read = (p) => readFileSync(join(ROOT, p), 'utf8')
// ☠️ 一律跑在去掉注释的源码上：注释里提到一个名字 ≠ 代码在用它（本项目被自己写的注释骗过）
const code = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:"'`\\])\/\/[^\n]*/gm, '$1')

const dbRaw = read('src/components/DeckBuilder.jsx')
const db = code(dbRaw)

ok('⓪ 注释剥离没把代码一起吃掉', db.length > dbRaw.length * 0.5 && db.includes('export default function DeckBuilder'))

// ============ ① 没有卡组时必须有一条一眼可见的「马上能玩」的路 ============
ok('① ★ 一个卡组都没有时渲染一键开打 CTA（!hasAnyDeck 分支）', /!hasAnyDeck\s*&&/.test(db))
ok('① ★ CTA 挂的是 handleQuickStart', /onClick=\{handleQuickStart\}/.test(db))
ok('① ★ CTA 用的是主按钮尺寸，不是小灰字（py-4 + text-lg + font-black）',
  /!hasAnyDeck[\s\S]{0,600}py-4[\s\S]{0,200}text-lg[\s\S]{0,200}font-black/.test(db))

// ============ ② 这条路不许把人卡住，也不许是假的 ============
const qsIdx = db.indexOf('const handleQuickStart')
const qs = qsIdx >= 0 ? db.slice(qsIdx, qsIdx + 1400) : ''
ok('② ★ handleQuickStart 存在', qs.length > 100)
ok('② ★ 用**玩家自己拥有的**卡组卡（不是全卡池 —— 否则会发出他没有的卡）',
  /generateRecommendedDeck\([^)]*ownedMainCards/.test(qs))
ok('② ★ 凑不满 DECK_SIZE 时退回默认卡组（宁可换套牌，不可点了没反应）',
  /main\.length === DECK_SIZE/.test(qs) && /onSelectDeck\(null\)/.test(qs))
ok('② ★ 组好的卡组要存下来（打完还留着一副能编辑的，不是一次性的）',
  /saveDecks\(/.test(qs) && /setDeckSlots\(/.test(qs))
ok('② ★ 存完真的开打（onSelectDeck 带上解析后的卡对象）',
  /onSelectDeck\(\{\s*mainCards/.test(qs))
ok('② 存进的是**空槽**，不覆盖已有卡组', /findIndex\(x => !x\)/.test(qs))

// ============ ③ 槽位列表不再铺 10 个一模一样的空槽 ============
ok('③ ★ 只渲染「已有卡组 + 一个新建位」（visibleIdx），不是 deckSlots.map 全铺',
  /visibleIdx/.test(db) && !/deckSlots\.map\(\(slot, i\) =>/.test(db))
ok('③ ★ visibleIdx = 已填的 + 第一个空位', /firstEmptyIdx/.test(db) && /filledIdx/.test(db))
ok('③ 槽位满了也不崩（没有空位时只渲染已填的）', /firstEmptyIdx >= 0 \?/.test(db))

// ============ ④ 一键组卡的「推荐」不许再是 10px ============
const recBtns = [...db.matchAll(/className="([^"]*)"[\s\S]{0,80}?applyRecommended\(/g)].map(m => m[1])
ok(`④ ★ 编辑器里的「推荐」按钮不得是 text-[10px]（10px 对 7 岁等于不存在）—— 实有 ${recBtns.length} 个`,
  recBtns.length >= 2 && recBtns.every(c => !/text-\[10px\]/.test(c)))

// ============ ⑤ 底部那条老快捷方式仍在（老玩家习惯，不许顺手删掉） ============
ok('⑤ 「使用默认测试卡组」入口仍在（它不再是唯一的路，但不该消失）',
  /deck\.defaultDeck/.test(db) && /onSelectDeck\(null\)/.test(db))

// ============ ⑥ 中英文键齐 ============
const zh = JSON.parse(read('src/i18n/zh.json'))
const en = JSON.parse(read('src/i18n/en.json'))
for (const k of ['deck.quickStart', 'deck.quickStartHint', 'deck.quickName']) {
  ok(`⑥ i18n 键 ${k} 中英文都有`, typeof zh[k] === 'string' && typeof en[k] === 'string')
}

console.log(`\n${fail === 0 ? '✅' : '⚠️'} test-deck-firstrun: 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
