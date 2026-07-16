// 战场位漂移守卫 —— MAX_FIELD_SLOTS 必须是唯一真相源
//
// 背景：2026-07 把每方战场位 5→6 时发现「5」散落在 4 类形态里，
// 改常量不会让它们跟着变，且旧的 42 套测试全绿（甚至奖励漏改）：
//   · reducer 内联副本 const FIELD_SLOTS = 5
//   · 手写字面量 [null, null, null, null, null]（躲过 Array(5) / <5 / slice(0,5) 全部 grep）
//   · Tailwind 字面 class（JIT 不认模板变量，只能写死）
//   · 测试自己写死 field.length === 5
//
// 本文件每条断言都由 MAX_FIELD_SLOTS 派生 —— 以后 6→7 只改 deckRules 一行，这里自动跟随。
//
// ⚠️ 本文件严禁出现完整的 Tailwind class 字面量（哪怕在注释里）：
//    Tailwind v4 无 config → 自动扫描全项目（含 scripts/、含注释），
//    写在这里的示例 class 会被编译进生产 CSS，并让「查 CSS 确认改对了」变成假通过。
//    下面所有 class 相关的模式都用字符串拼接构造，不留完整字面量。

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MAX_FIELD_SLOTS } from '../src/data/deckRules.js'
import { initialBattleState } from '../src/engine/battleReducer.js'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SRC = join(ROOT, 'src')

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) { pass++; console.log(`  ✓ ${name}`) } else { fail++; console.log(`  ✗ ${name}`) } }

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(js|jsx)$/.test(p)) out.push({ rel: relative(ROOT, p), text: readFileSync(p, 'utf8') })
  }
  return out
}
const srcFiles = walk(SRC)
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const lineOf = (text, idx) => text.slice(0, idx).split('\n').length

// ============ ① 执行级：reducer 初始态必须跟随常量 ============
// 唯一能抓住「deckRules 改了 6、reducer 内联副本还留在 5」的断言。
for (const side of ['player', 'enemy']) {
  ok(`① initialBattleState.${side}.field.length === MAX_FIELD_SLOTS(${MAX_FIELD_SLOTS})，实际 ${initialBattleState[side].field.length}`,
    initialBattleState[side].field.length === MAX_FIELD_SLOTS)
}

const reducerSrc = read('src/engine/battleReducer.js')
ok('① battleReducer 从 deckRules import 战场位常量（不再内联副本）',
  /import\s*\{[^}]*MAX_FIELD_SLOTS[^}]*\}\s*from\s*['"][^'"]*deckRules/.test(reducerSrc))
ok('① battleReducer 内无 `FIELD_SLOTS = <数字>` 内联字面量',
  !/(?:const|let|var)\s+\w*FIELD_SLOTS\w*\s*=\s*\d+/.test(reducerSrc))

// ============ ② 源码级：数字 5 的字面量形态 ============
// 形态 A：手写空场 [null, null, …]（≥3 个 null 即视为写死棋盘）
const NULL_RUN = /\[\s*null\s*(?:,\s*null\s*){2,}\]/g
const nullHits = []
for (const f of srcFiles) for (const m of f.text.matchAll(NULL_RUN)) nullHits.push(`${f.rel}:${lineOf(f.text, m.index)}`)
ok(`② src/ 无手写空场字面量 [null,null,…]（应用 Array(MAX_FIELD_SLOTS).fill(null)）${nullHits.length ? '\n     → ' + nullHits.join('\n     → ') : ''}`,
  nullHits.length === 0)

// 形态 B：Array(N) / Array.from({length: N})，仅当 N === MAX_FIELD_SLOTS 才报警
// （decks.js 的 MAX_SLOTS=10 卡组槽、GachaScreen 十连抽等不误伤）
const LEN_PATTERNS = [
  /(?:new\s+)?Array\(\s*(\d+)\s*\)/g,
  /Array\.from\(\s*\{\s*length:\s*(\d+)/g,
]
const lenHits = []
for (const f of srcFiles) for (const re of LEN_PATTERNS) {
  for (const m of f.text.matchAll(re)) {
    if (Number(m[1]) === MAX_FIELD_SLOTS) lenHits.push(`${f.rel}:${lineOf(f.text, m.index)}  → ${m[0]}`)
  }
}
ok(`② src/ 无 Array(${MAX_FIELD_SLOTS}) 式写死长度（疑似战场位）${lenHits.length ? '\n     → ' + lenHits.join('\n     → ') : ''}`,
  lenHits.length === 0)

// ============ ③ 布局级：战场组件不许把槽数编进 Tailwind 字面 class ============
// Tailwind JIT 只认字面量 → 任何把槽数写进 class 的方案都无法跟随常量。
// 可持续写法：BattleScreen 用 flex 自适应；TutorialScreen 用 行内 style 的
// gridTemplateColumns（行内 style 绕开 JIT）；TestArena 固定尺寸 + 横向滚动。
// 模式用拼接构造，避免本文件被 Tailwind 扫成候选 class（见文件头警告）。
// 锚点：三个战场容器都必须挂 data-field-area="true"（BattleScreen 原有，本次给
// TutorialScreen / TestArena 补上）—— 有了稳定锚点，守卫才能只盯战场、不误伤别处的栅格。
const W_CALC = new RegExp('w-' + '\\[calc\\(')            // 匹配 w- 开头的 arbitrary calc 槽宽
const COLS_N = new RegExp('grid-' + 'cols-\\d')           // grid-cols-<数字>
const FRACTION_W = new RegExp('\\bw-1' + '/\\d')          // w-1/N

const FIELD_OWNERS = {
  'src/components/BattleScreen.jsx': 2,
  'src/components/TutorialScreen.jsx': 2,
  'src/components/TestArena.jsx': 2,
}
for (const [rel, expected] of Object.entries(FIELD_OWNERS)) {
  const text = read(rel)
  const fieldLines = text.split('\n').filter(l => l.includes('data-field-area'))
  ok(`③ ${rel} 有 ${expected} 个 data-field-area 战场容器锚点（实际 ${fieldLines.length}）`,
    fieldLines.length === expected)
  ok(`③ ${rel} 战场容器不用 grid 列数字面量 class`, !fieldLines.some(l => COLS_N.test(l)))
}

// BattleScreen 的槽宽必须交给 flex 自适应，不许出现把槽数编进 class 的 calc / 分数宽
const bs = read('src/components/BattleScreen.jsx')
ok('③ BattleScreen 无 arbitrary calc 槽宽字面量（槽宽应由 flex 自适应）', !W_CALC.test(bs))
ok('③ BattleScreen 无分数宽 class（w-1 斜杠 N）', !FRACTION_W.test(bs))

console.log(`\n${fail === 0 ? '✅' : '⚠️'} field-slots 漂移守卫: ${pass}/${pass + fail}  (MAX_FIELD_SLOTS=${MAX_FIELD_SLOTS})`)
process.exit(fail === 0 ? 0 : 1)
