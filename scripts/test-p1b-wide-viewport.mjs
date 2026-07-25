#!/usr/bin/env node
// P1 B「宽视口取回被浪费的宽度 + 手牌卡比例」的不变式守卫（2026-07-25）
//
// 背景：战斗容器长期 `max-w-3xl`(768px) 封顶 —— 12.9 寸 iPad 横屏 1366px 下两侧黑边共 598px，
// 浪费 43.8% 宽度。P1 A 把战场卡锁成 5:7 + cqh 之后，放宽容器卡片才会**等比变大**（P1 A 之前
// 放宽只会把卡拉扁，故当年写死"不得改 max-width"——那条禁令只对 501–780 那一档仍有效）。
//
// 实测地面真相（vite preview 真机尺寸，两行摆满 6 张真卡）：
//   1366×1024：容器 768→1366，卡槽 114.7×160.5 → 167.6×234.7（+46%）
//   1366×950 ：→145.2×203.3   1024×1366：容器→1024，→157.3×220.3
//   1180×712 ：→99.5×139.3    1080×660 ：→80.9×113.3（这两档高度受限，与 P0 记录的 113 一致）
//   768×1024（竖屏基线）：容器/卡槽**逐项未变**（114.7×160.5）
//   844×390（手机横屏）：容器 768、卡槽 31.3 **逐项未变**（那 45px 溢出是旧病，本次没动）
//   全档比例恒 0.714、卡内零溢出、无文档滚动条。
//
// ☠️ 会静默复发的坑（本文件逐条钉死）：
//   坑1：下界写小于 900 → 768 宽的竖屏 iPad（唯一合格基线档）被卷进来，等于改基线。
//   坑2：只放宽 max-width 不抬 `[data-field-area]` 的 25vh → 卡槽被 256px 卡住，白改。
//   坑3：手牌卡定高忘了 `min-width: 0` → flex 的 `min-width: auto`(内容最小宽)**悄悄压过**
//        aspect-ratio 反推的宽度（实测 1180×712：应 76.3 实得 96.2，比例回到 0.9），像"没生效"。
//   坑4：手牌卡定高下限低于 110px（原 `max-h-[110px]`）→ 1080×660 下 15vh=99，卡内溢出 5px。
//   坑5：手牌规则漏掉 `min-height: 501` 门槛 → 手机横屏档 `[data-hand-area]{height:90px}` 被撑破。
// （Node 无 renderer 测不了运行时，故守源码不变式 —— 与 P1 A / 能量公式同款策略。）

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }

const css = readFileSync(join(ROOT, 'src/index.css'), 'utf8')
const battle = readFileSync(join(ROOT, 'src/components/BattleScreen.jsx'), 'utf8')

/** 取出 @media 查询块的完整正文（大括号配对，不用固定窗口长度 —— 后面再加 CSS 也不会误伤） */
function mediaBlock(re) {
  const m = css.match(re)
  if (!m) return null
  let i = css.indexOf(m[0]) + m[0].length, depth = 1
  const start = i
  while (i < css.length && depth > 0) {
    if (css[i] === '{') depth++
    else if (css[i] === '}') depth--
    i++
  }
  return css.slice(start, i - 1)
}

// ---- ① 宽视口档存在，且下界把 768 竖屏挡在外面 ----
const wideRe = /@media\s*\(min-width:\s*(\d+)px\)\s*\{/
const wideM = css.match(wideRe)
ok('① 宽视口档存在（@media min-width）', !!wideM)
const wide = mediaBlock(wideRe)

if (wideM && wide) {
  const minW = +wideM[1]
  ok(`① ★ 下界 ${minW} 必须 > 768 —— 竖屏 iPad(768 宽) 是唯一合格基线档，绝不能被卷进来`, minW > 768)
  ok(`① 下界 ${minW} 必须 ≤ 1024 —— 否则 12.9 寸竖屏(1024 宽)拿不到这份收益`, minW <= 1024)

  // ---- ② 真的放宽了容器（这是本档的全部意义）----
  ok('② 放宽 [data-battle-container] 的 max-width（覆盖 Tailwind 的 max-w-3xl）',
    /\[data-battle-container\]\s*\{[^}]*max-width:/.test(wide))
  ok('② max-width 必须能吃满视口（min(100%, …) 形式，不是又换一个死宽度）',
    /max-width:\s*min\(\s*100%\s*,/.test(wide))

  // ---- 坑2：必须同时抬高战场行的 25vh，否则白改 ----
  const fieldRule = wide.match(/\[data-field-area\]\s*\{([^}]*)\}/)
  ok('② ★ 同档必须抬高 [data-field-area] 的 max-height（否则 25vh=256px 先卡住卡槽，放宽等于白改）',
    !!fieldRule && /max-height:\s*(\d+)vh/.test(fieldRule[1]))
  if (fieldRule) {
    const vh = +(fieldRule[1].match(/max-height:\s*(\d+)vh/)?.[1] || 0)
    ok(`② 抬高后的 ${vh}vh 必须 > 25vh（原值）`, vh > 25)
  }
}

// ---- ③ 老的高度档必须原样保留：501–780 那一档仍然**不得**出现 max-width ----
const padTier = mediaBlock(/@media\s*\(min-height:\s*501px\)\s*and\s*\(max-height:\s*780px\)\s*\{/)
ok('③ 501–780 高度档仍在', !!padTier)
ok('③ ★ 501–780 档内仍**不得**改 max-width（那一档缺的是高度，放宽宽度确实没用 —— 老实测教训）',
  !!padTier && !/max-width/.test(padTier))

// ---- ④ 手牌卡比例修复 ----
const handRe = /@media\s*\(min-height:\s*(\d+)px\)\s*\{/g
let handBlock = null, handMin = 0
for (const m of css.matchAll(handRe)) {
  const blk = mediaBlock(new RegExp(m[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  if (blk && /data-hand-card/.test(blk)) { handBlock = blk; handMin = +m[1]; break }
}
ok('④ 手牌卡档存在（含 [data-hand-card] 规则）', !!handBlock)
if (handBlock) {
  // 坑5：必须把手机横屏档(≤500，hand-area 被压到 90px)排除在外
  ok(`④ ★ 门槛 ${handMin} 必须 ≥ 501 —— 手机横屏档把 [data-hand-area] 压到 90px，定高会撑破它`,
    handMin >= 501)
  ok('④ 高度驱动：width:auto（改由 aspect-ratio 反推宽度）', /width:\s*auto/.test(handBlock))
  ok('④ 解除 max-h-[110px] 截断（max-height: none）', /max-height:\s*none/.test(handBlock))
  // 坑3：flex 的 min-width:auto 会悄悄压过 aspect-ratio
  ok('④ ★ 必须写 min-width: 0 —— flex 默认 min-width:auto(内容最小宽)会悄悄压过 aspect-ratio，'
    + '实测 1180×712 下比例从 0.714 被顶回 0.9，看起来像"规则没生效"',
    /min-width:\s*0/.test(handBlock))
  // 坑4：下限不能低于原来的 110px 上限
  const floor = +(handBlock.match(/height:\s*clamp\(\s*(\d+)px/)?.[1] || 0)
  ok(`④ ★ 定高下限 ${floor}px 必须 ≥ 110px（= 原 max-h-[110px]）—— 96px 时 1080×660 卡内溢出 5px`,
    floor >= 110)
}

// ---- ⑤ JSX 钩子在位（否则上面所有选择器都是空打）----
ok('⑤ BattleScreen.jsx 有 data-hand-card 钩子', /data-hand-card="true"/.test(battle))
ok('⑤ 手牌卡仍保留 aspect-[5/7]（宽度由它反推，删了比例就没了）',
  /data-hand-card="true"[\s\S]{0,400}aspect-\[5\/7\]/.test(battle))

console.log(`\n${fail === 0 ? '✅' : '⚠️'} test-p1b-wide-viewport: 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
