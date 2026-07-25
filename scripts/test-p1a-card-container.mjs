#!/usr/bin/env node
// P1 A「战场卡比例锁定 + 容器查询排版」的不变式守卫（2026-07-25）
//
// 背景：战场卡此前无 aspect-ratio，宽度死(≈114px)、高度是 flex 剩余空间 → 比例 0.48↔1.83 漂移、
// 矮视口下 ~104px 内容画到卡外。P1 A 把卡槽锁 5:7 + FIT，卡内改 cqh → 结构上不可能溢出。
//
// ☠️ 这套方案有**两个会静默复发的坑**，本文件专门钉死：
//   坑1「svh 静默回退」：卡内 cqh 必须有 `container-type: size` 祖先(命名容器 bh-slot)，
//        否则 cqh 悄悄回退到视口单位 svh —— 本地像对了、真机全歪。
//   坑2「cqh-in-height 不重算」：卡槽高度**不能**用 100cqh —— 实测 `container-type: size` 施加
//        在 flex-grow 行上 + 槽高用 100cqh 时，祖先 resize 后空槽不重算(卡在旧视口高度)。
//        必须：行用 `container-type: inline-size`，槽高用 `min(100%, …cqw…)`(百分比高度稳定重算)。
//   浏览器里已实测：切横竖屏后两行槽高恒一致、比例恒 0.71、内容不溢出、零 console 错误。
//   （Node 无 renderer 测不了运行时，故此处守源码不变式 —— 与能量公式/friendlyField 同款策略。）

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }

const css = readFileSync(join(ROOT, 'src/index.css'), 'utf8')
const card = readFileSync(join(ROOT, 'src/components/Card.jsx'), 'utf8')

// 取 P1 A 段落（从标题到文件尾）
const p1 = css.slice(css.indexOf('P1 A'))
ok('① 存在 P1 A CSS 段', p1.length > 200 && /data-field-area/.test(p1))

// ---- 坑2 守卫：行是 inline-size、槽高用 100%，都**不是** cqh ----
ok('② 战场行用 container-type: inline-size（不是 size —— size 会让槽高 cqh 不重算）',
  /\[data-field-area\]\s*\{[^}]*container-type:\s*inline-size/.test(p1))
ok('② ★ 卡槽高度用 min(100%, …) —— **绝不能**改回 100cqh（那会让空槽 resize 后卡在旧高度）',
  /height:\s*min\(\s*100%\s*,/.test(p1) && !/height:\s*min\(\s*100cqh/.test(p1))
ok('② 卡槽宽度预算用 100cqw（稳定）', /100cqw/.test(p1))

// ---- 坑1 守卫：槽是命名 size 容器，卡内 cqh 才有据可依 ----
ok('③ 卡槽是命名 size 容器 bh-slot（否则卡内 cqh 静默回退 svh）',
  /container:\s*bh-slot\s*\/\s*size/.test(p1))
ok('③ 卡槽锁 aspect-ratio 5/7（比例恒定的根）', /aspect-ratio:\s*5\s*\/\s*7/.test(p1))
ok('③ 卡内字号用 cqh + max(px,…) 下限（跟卡走但不小于像素底线）',
  /\[data-cq="name"\][^}]*max\([^)]*cqh\)/.test(p1) && /\[data-cq="stats"\][^}]*max\([^)]*cqh\)/.test(p1))

// ---- 降级卡面：命名容器精确匹配，只在战场卡触发 ----
ok('④ 降级卡面用 @container bh-slot（命名 → 不误伤碰巧成容器的祖先）',
  /@container\s+bh-slot\s*\(\s*max-height:/.test(p1))
ok('④ 降级时藏技能名/阵营名', /@container\s+bh-slot[\s\S]*?\[data-cq="skill"\][\s\S]*?display:\s*none/.test(p1))

// ---- 作用域：护住其余 7 个用 Card 的界面 ----
// 基础 cqh 规则（@container 段之前）必须用 [data-field-area] 后代选择器限定；
// @container bh-slot 段内的规则由**命名容器**限定（bh-slot 只存在于战场），天然只作用战场卡。
// 用 @container **规则**的位置切分（不是注释里的 @container 提及）
const ruleIdx = p1.search(/@container\s+bh-slot\s*\(/)
const baseSeg = ruleIdx > 0 ? p1.slice(0, ruleIdx) : p1
const baseCqLines = baseSeg.split('\n').filter(l => /\[data-cq=/.test(l) && /cqh|font-size/.test(l))
ok('⑤ 基础 cqh 排版规则都限定在 [data-field-area] 作用域内（Card.jsx 被 8 界面复用，不能全局改）',
  baseCqLines.length >= 5 && baseCqLines.every(l => /\[data-battle-container\]\s*\[data-field-area\]/.test(l)))
ok('⑤ 降级段用 @container 命名容器限定（不需后代选择器，bh-slot 只在战场）', ruleIdx > 0)

// ---- Card.jsx 侧：惰性 data 钩子在位（否则 CSS 选择器空打） ----
for (const hook of ['icon', 'name', 'faction', 'hpbar', 'hptext', 'stats', 'skill']) {
  ok(`⑥ Card.jsx 有 data-cq="${hook}" 钩子`, new RegExp(`data-cq="${hook}"`).test(card))
}

console.log(`\n${fail === 0 ? '✅' : '⚠️'} test-p1a-card-container: 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
