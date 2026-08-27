#!/usr/bin/env node
// 「开发文档不许说谎」守卫（2026-08-25）
//
// `test-copy-truth` 管的是**给玩家看的文案**；这一条管的是**给开发者看的文档** ——
// CLAUDE.md 和 `.claude/rules/*.md`。它们是每次会话的**输入指令**，写错一个常量，
// 后面所有基于它的设计和平衡计算都会跟着错。
//
// 实测撞到的漂移（2026-08-25 全部为真）：
//   · CLAUDE.md 写 `MAX_FIELD_SLOTS=5`，代码是 **6** ← 最危险：照着 5 个战场位设计卡牌会直接算错
//   · CLAUDE.md 与两处 rules 写 cards.js **104 张**，实际 **124 张**
//   · CLAUDE.md 写 spCards **16 张**，实际 **17 张**
//   · CLAUDE.md 写闯关 **23 关**，实际 **29 关**
//   · `.claude/rules/gacha-cards.md` 抽卡概率写 **85/12/3**，代码是 **R68/SR25/SSR5/SP2**
//     （还整个漏了 SP 档）。⚠️ 游戏内给玩家看的概率公示是**对的**，错的只有开发文档。
//
// ☠️ 判据是「文档里的数字 == 代码真值」，不是措辞。每条都必须**先匹配到**才算数 ——
//    正则匹配不到时如果算通过，这个守卫就是纯摆设（下面每条都带这个自检）。

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import cards from '../src/data/cards.js'
import eventCards from '../src/data/eventCards.js'
import spCards from '../src/data/spCards.js'
import { DECK_SIZE, SP_DECK_SIZE, MAX_FIELD_SLOTS, LEADER_HP } from '../src/data/deckRules.js'
import { campaignData } from '../src/data/campaignData.js'
import { TUTORIAL_LEVELS } from '../src/data/tutorialData.js'
import { RARITY_WEIGHTS } from '../src/hooks/useGacha.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }
const read = (p) => readFileSync(join(ROOT, p), 'utf8')

const stageCount = campaignData.chapters.reduce((n, ch) => n + ch.stages.length, 0)

// ============ ① 逐条对账：文档里的数字必须等于代码真值 ============
const CHECKS = [
  ['CLAUDE.md', 'cards.js 生物卡数', /cards\.js\s+#\s*卡牌数据库\s*—\s*(\d+)\s*张/, cards.length],
  ['CLAUDE.md', 'eventCards.js 事件卡数', /eventCards\.js\s+#\s*事件卡数据\s*—\s*(\d+)\s*张/, eventCards.length],
  ['CLAUDE.md', 'spCards.js SP 卡数', /spCards\.js\s+#\s*SP觉醒卡数据\s*—\s*(\d+)\s*张/, spCards.length],
  ['CLAUDE.md', 'DECK_SIZE', /DECK_SIZE\s*=\s*(\d+)/, DECK_SIZE],
  ['CLAUDE.md', 'MAX_FIELD_SLOTS', /MAX_FIELD_SLOTS\s*=\s*(\d+)/, MAX_FIELD_SLOTS],
  ['CLAUDE.md', '闯关章数', /campaignData\.js[^\n]*?（\s*(\d+)\s*章/, campaignData.chapters.length],
  ['CLAUDE.md', '闯关关卡数', /campaignData\.js[^\n]*?(\d+)\s*关）/, stageCount],
  ['.claude/rules/card-system.md', '基础包卡数', /\|\s*基础包\s*\|\s*BASE\s*\|\s*(\d+)\s*\|/, cards.length],
  ['.claude/rules/card-system.md', '战场位（当前 N）', /MAX_FIELD_SLOTS，当前\s*(\d+)/, MAX_FIELD_SLOTS],
  ['.claude/rules/factions-events.md', '战场位（当前 N）', /MAX_FIELD_SLOTS，当前\s*(\d+)/, MAX_FIELD_SLOTS],
  ['.claude/rules/gacha-cards.md', '基础包生物卡数', /当前基础包共\s*(\d+)\s*张生物卡/, cards.length],
  ['.claude/rules/battle-system.md', '主人 HP', /\*\*(\d+)\s*HP\*\*/, LEADER_HP],
  ['.claude/rules/battle-system.md', '实际主卡组张数', /主卡组\s*(\d+)\s*张、SP 卡组/, DECK_SIZE],
  ['.claude/rules/battle-system.md', '实际 SP 卡组张数', /SP 卡组\s*(\d+)\s*张、战场位/, SP_DECK_SIZE],
  ['.claude/rules/battle-system.md', '实际战场位', /战场位\s*(\d+)\s*个/, MAX_FIELD_SLOTS],
]
for (const [file, label, re, truth] of CHECKS) {
  const src = existsSync(join(ROOT, file)) ? read(file) : ''
  const m = src.match(re)
  // 自检：匹配不到就是正则失效（文档改了措辞），必须报红而不是静默放行
  ok(`① 【${file}】${label} 的正则匹配得到（匹配不到 = 这条检查成了摆设）`, !!m)
  if (m) {
    ok(`① ★ 【${file}】${label}：文档写 ${m[1]}，代码真值 ${truth}`, +m[1] === truth)
  }
}

// ============ ② 抽卡概率表必须和代码的权重一致 ============
// 文档曾写 85/12/3，代码是 68/25/5/2 —— 差了一倍，还整个漏掉 SP 档。
{
  const g = read('.claude/rules/gacha-cards.md')
  const m = g.match(/\*\*普通包\*\*\s*\|\s*(\d+)%\s*\|\s*(\d+)%\s*\|\s*(\d+)%/)
  ok('② 抽卡概率表的正则匹配得到', !!m)
  if (m) {
    ok(`② ★ R 档：文档 ${m[1]}% vs 代码 ${RARITY_WEIGHTS.R}%`, +m[1] === RARITY_WEIGHTS.R)
    ok(`② ★ SR 档：文档 ${m[2]}% vs 代码 ${RARITY_WEIGHTS.SR}%`, +m[2] === RARITY_WEIGHTS.SR)
    ok(`② ★ SSR 档：文档 ${m[3]}% vs 代码 ${RARITY_WEIGHTS.SSR}%`, +m[3] === RARITY_WEIGHTS.SSR)
  }
  // ☠️ 这里的数字必须带前边界：`2%` 会匹配到表格里的 `12%`（SR 档），整条断言当场变成假绿。
  //    同一个坑在任何「数字 + 单位」的 grep 里都会复发。
  ok(`② ★ 文档必须提到 SP 档（代码里有 ${RARITY_WEIGHTS.SP}% 的 SP，文档漏掉整整一档）`,
    /SP\s*觉醒|SP\s*档/.test(g) && new RegExp(`(?<![\\d.])${RARITY_WEIGHTS.SP}\\s*%`).test(g))
  ok('② 权重之和 = 100（否则"百分比"这个说法本身就不成立）',
    Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0) === 100)
}

// ============ ③ 教学关卡数：文档说「3基础+2进阶」，得和真数据对上 ============
{
  const c = read('CLAUDE.md')
  const m = c.match(/tutorialData\.js[^\n]*?（\s*(\d+)\s*基础\+(\d+)\s*进阶/)
  ok('③ 教学关卡数的正则匹配得到', !!m)
  if (m) {
    ok(`③ ★ 教学关卡总数：文档 ${+m[1]} + ${+m[2]} = ${+m[1] + +m[2]}，代码 ${TUTORIAL_LEVELS.length}`,
      +m[1] + +m[2] === TUTORIAL_LEVELS.length)
  }
}

// ============ ④ 进度条动画必须写 initial（顺手钉死的一类小病） ============
// ☠️ framer 的 `animate={{ width }}` 不写 initial 时，会从元素的**自然宽度**动画过去 ——
//    进度条的自然宽度是 100%，于是每次挂载都「从满格缩到真实值」。
//    实测：抽卡的图鉴进度条 9/157 却先闪一下满格（Card.jsx 的血条和 Collection 的四条都写了 initial，
//    只有它漏了）。对 7 岁的玩家那半秒是「我图鉴满了？」。
{
  // ☠️ 必须先去注释。本次写守卫时的原话注释里就有「initial={false} 不能省」，
  //    结果把 initial 删掉都不变红 —— 变异测试当场抓到。
  //    这是本项目**第三次**被自己写的注释骗（前两次见 test-tutorial-solvable ③-0 / test-copy-truth）。
  //    结论已成铁律：**任何 grep 型断言一律跑在去注释的源码上**。
  const stripJs = (src) => src
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"'`\\])\/\/[^\n]*/gm, '$1')
  const files = ['GachaScreen', 'Card', 'Collection', 'BattleScreen', 'TutorialScreen']
  let missing = []
  for (const f of files) {
    const src = stripJs(read(`src/components/${f}.jsx`))
    for (const m of src.matchAll(/<motion\.div[\s\S]{0,400}?animate=\{\{\s*width:/g)) {
      const start = src.lastIndexOf('<motion.div', m.index + 12)
      const tag = src.slice(start, m.index + m[0].length)
      if (!/initial=/.test(tag)) missing.push(`${f}.jsx:${src.slice(0, start).split('\n').length}`)
    }
  }
  ok(`④ ★ 所有宽度动画的进度条都写了 initial（漏的会「从满格缩到真实值」）——`
    + (missing.length ? ` 漏了 ${missing.join(', ')}` : ' 全部合规'),
    missing.length === 0)
}

console.log(`\n${fail === 0 ? '✅' : '⚠️'} test-docs-truth: 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
