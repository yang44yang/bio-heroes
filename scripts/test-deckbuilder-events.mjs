#!/usr/bin/env node
// DeckBuilder 事件卡支持回归测试（齐齐实测「可触发SP的事件卡在卡组里找不到」修复）
//
// 背景：DeckBuilder 原本 selectableMainCards 只含 character，事件卡（含可触发 SP 的）无处可加，
// → 自建卡组永远没有触发事件卡 → 自建卡组触发不了 SP。本次让事件卡可与生物卡混编进主卡组。
// 用 grep 源码接线（不 import 组件，避 ESM/JSX）+ import 纯数据校验。
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import eventCardsRaw from '../src/data/eventCards.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const eventCards = eventCardsRaw.default || eventCardsRaw
let pass = 0, fail = 0
const ok = (n, c) => { if (c) pass++; else { fail++; console.error(`❌ ${n}`) } }

const db = readFileSync(join(ROOT, 'src/components/DeckBuilder.jsx'), 'utf8')
const card = readFileSync(join(ROOT, 'src/components/Card.jsx'), 'utf8')
const zh = JSON.parse(readFileSync(join(ROOT, 'src/i18n/zh.json'), 'utf8'))
const en = JSON.parse(readFileSync(join(ROOT, 'src/i18n/en.json'), 'utf8'))

// ---- 接线：事件卡进可选池 ----
ok('DeckBuilder: selectableMainPool 把 eventCards 混入主卡池',
  /selectableMainPool\s*=\s*\[\s*\.\.\.selectableMainCards,\s*\.\.\.eventCards\s*\]/.test(db))
ok('DeckBuilder: ownedMainCards 基于 selectableMainPool 过滤（不再只 character）',
  /selectableMainPool\.filter\(c => collection\[c\.id\]\)/.test(db) &&
  !/selectableMainCards\.filter\(c => collection\[c\.id\]\)/.test(db))

// ---- 类型筛选：能筛出"事件"找触发 SP 的卡 ----
ok('DeckBuilder: 有 filterType 状态', /const \[filterType, setFilterType\] = useState/.test(db))
ok('DeckBuilder: filteredCards 按 type 过滤（event vs character）',
  /filterType === 'event' \? c\.type === 'event' : c\.type === 'character'/.test(db))
ok('DeckBuilder: filterType 在 filteredCards useMemo 依赖里',
  /\}, \[showSp, filterFaction, filterType, filterRarity, filterSubType, sortBy\]\)/.test(db))
ok('DeckBuilder: 类型筛选 UI 用 deck.typeEvent', /t\('deck\.typeEvent'\)/.test(db))
ok('DeckBuilder: 类型筛选仅主卡组显示（!showSp 守卫）',
  /\{!showSp && \(\s*<select/.test(db))

// ---- Card.jsx 事件卡不置灰（池里要满色显示）----
ok('Card.jsx: 事件卡不算死亡（isDead 带 !isEvent 守卫，事件卡 hp=0 不置灰）',
  /isDead\s*=\s*!isEvent\s*&&\s*hp\s*<=\s*0/.test(card))

// ---- i18n 键齐全 ----
for (const k of ['deck.allType', 'deck.typeBio', 'deck.typeEvent']) {
  ok(`zh.json 有 ${k}`, typeof zh[k] === 'string' && zh[k].length > 0)
  ok(`en.json 有 ${k}`, typeof en[k] === 'string' && en[k].length > 0)
}

// ---- 数据：确有可触发 SP 的事件卡（否则本功能无意义）----
const spTriggerEvents = eventCards.filter(c => c.spSummonRule)
ok('eventCards 含可触发 SP 的事件卡（spSummonRule 非空）', spTriggerEvents.length > 0)
ok('每个阵营至少 1 张可触发 SP 的事件卡（自建任意阵营卡组都能触发）',
  ['nature', 'body', 'pathogen', 'tech'].every(f =>
    spTriggerEvents.some(c => c.faction === f)))
console.log(`  可触发 SP 的事件卡 ${spTriggerEvents.length} 张：${spTriggerEvents.map(c => c.name).join('、')}`)

console.log(`\n${fail === 0 ? '✅' : '⚠️'} 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
