#!/usr/bin/env node
// 响应式高度档位守卫（2026-07-24，P0 iPad 横屏适配）
//
// 背景：战斗界面的紧凑程度按**视口高度**分档（不是 orientation）—— 因为"卡片内容画到卡外"
// 纯粹是垂直预算不足造成的。档位边界是承重的，改错了会**静默**回归：
//   · 上界调太大 → 竖屏 iPad(1024 高) 被误压缩，而竖屏是目前唯一合格档位
//   · 下界与手机档重叠/留缝 → 某段高度要么两档打架、要么没人管（本次修的就是"没人管"的那段）
//
// 实测地面真相（vite preview 真机尺寸，战场上放真卡后测量槽位 vs 卡片内容最小高度 107px）：
//   1024×660 (10.2寸横屏+Safari)：槽位 63 → 溢出 44px   ← 修前
//   1180×712 (11寸横屏+Safari)  ：槽位 89 → 溢出 18px   ← 修前
//   1024×748                    ：槽位 107 → 溢出 0     ← 临界点
//   修后：660→槽位113、712→139、744→155、768→167，全部 -2（不溢出）；竖屏 1024 逐项未变。
//
// ☠️ 变异性：把 max-height 改大到能包住 1024 → ②红；把 501 改成 500 或 502 → ①红；
//    删掉任一压缩规则 → ③红。

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }

const css = readFileSync(join(ROOT, 'src/index.css'), 'utf8')

// ---- 解析两个高度档 ----
const phoneTier = css.match(/@media\s*\(max-height:\s*(\d+)px\)\s*\{/)
const padTier = css.match(/@media\s*\(min-height:\s*(\d+)px\)\s*and\s*\(max-height:\s*(\d+)px\)\s*\{/)

ok('① 手机横屏档存在（@media max-height）', !!phoneTier)
ok('① iPad 横屏中间档存在（@media min-height + max-height）', !!padTier)

if (phoneTier && padTier) {
  const phoneMax = +phoneTier[1]
  const padMin = +padTier[1], padMax = +padTier[2]

  // ① 两档必须严格互斥且无缝：padMin === phoneMax + 1
  ok(`① 两档严格互斥且无缝（手机档 ≤${phoneMax}，iPad 档从 ${padMin} 起）`,
    padMin === phoneMax + 1)

  // ② ★ 最关键：竖屏 iPad(1024 高) 必须落在档位**外**（竖屏是唯一合格档位，不能被压缩）
  ok(`② ★ 竖屏 iPad 高度 1024 必须在档位外（当前上界 ${padMax}）`, 1024 > padMax)

  // ② 上界必须 ≥ 实测临界 748，否则 744/748 附近的机型仍会溢出
  ok(`② 上界 ${padMax} 必须 ≥ 实测临界 748（否则 mini 加到主屏 744 仍溢出）`, padMax >= 748)

  // ② 所有实测会溢出的真机横屏高度都必须被覆盖
  for (const h of [660, 712, 726, 744, 768]) {
    ok(`② 实测溢出档位 ${h}px 必须落在 iPad 档内 [${padMin}, ${padMax}]`, h >= padMin && h <= padMax)
  }

  // ③ 档内必须真的压缩了"家具"（只压家具、不碰卡片布局模型）
  // ⚠️ 原本这里是 `css.slice(start, start + 2600)` —— 固定窗口，一旦后面新增 CSS 就会把
  //    别的档位的规则吃进窗口，让下面的 max-width 反向锁误红（或反过来漏检）。改成大括号配对。
  const start = css.indexOf(padTier[0]) + padTier[0].length
  const block = (() => {
    let i = start, depth = 1
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth++
      else if (css[i] === '}') depth--
      i++
    }
    return css.slice(start, i - 1)
  })()
  for (const hook of ['data-field-area', 'data-hp-bar-area', 'data-pb-bar', 'data-vs-divider', 'data-top-bar']) {
    ok(`③ iPad 档压缩了 [${hook}]`, block.includes(hook))
  }
  // ③ 反向：绝不能在这一档里动 max-width（前人实测：放大 max-width 会把卡横向拉扁且字号不变）
  ok('③ iPad 档不得改 max-width（拉扁卡片的死路，见 SESSION.md 实测教训）',
    !/max-width/.test(block))
}

// ---- ④ 转屏提示的**方向**（2026-07-25 反转）----
// 背景：这条提示从 2026-03-26 起写的是「手机竖屏 → 请横过来玩」，而实测方向恰好相反：
//   390×844 竖屏比例 0.714、零溢出、44pt 热区齐全，是手机上唯一能玩的档，却被全屏黑幕挡住；
//   844×390 横屏卡槽 22.3×31.3、内容溢出 45px，才是坏掉的那档，却永远看不到提示。
// ☠️ 变异：把 orientation 改回 portrait → ④-1 红；去掉 max-height 上界 → ④-2 红
//   （iPad 横屏会被全屏黑幕挡住 = 齐齐直接玩不了）；去掉 hover:none → ④-3 红；
//   i18n key 少一边 → ④-4 红；把旧文案留在库里 → ④-5 红。
const promptQuery = css.match(/@media\s*\(([^{]*?)\)\s*\{\s*\[data-landscape-prompt\]/)
ok('④ 找到转屏提示的媒体查询（找不到说明提示机制被改写，请修这条守卫而不是删它）', !!promptQuery)
if (promptQuery) {
  const q = promptQuery[1]
  ok(`④-1 ★ 提示必须只在**横屏**弹（当前条件：${q}）—— 改回 portrait 就又把人从唯一能玩的竖屏赶走`,
    /orientation:\s*landscape/.test(q) && !/orientation:\s*portrait/.test(q))
  const mh = q.match(/max-height:\s*(\d+)px/)
  ok(`④-2 ★ 必须有 max-height 上界且 ≤ 500（当前 ${mh ? mh[1] : '无'}）—— 否则 iPad 横屏（高 ≥660）`
    + `会被这块 fixed inset-0 z-[999] 的全屏黑幕挡住，齐齐直接玩不了`,
    !!mh && +mh[1] <= 500)
  ok('④-3 必须限定 hover: none（只针对触屏）—— 桌面把窗口拖矮了弹「请转竖屏」是荒谬的全屏拦截',
    /hover:\s*none/.test(q))
}

// ④-4 JSX 用到的 i18n key 必须两种语言都在（缺了孩子会看到原始 key 字符串）
const battle = readFileSync(join(ROOT, 'src/components/BattleScreen.jsx'), 'utf8')
const zh = readFileSync(join(ROOT, 'src/i18n/zh.json'), 'utf8')
const en = readFileSync(join(ROOT, 'src/i18n/en.json'), 'utf8')
const promptBlock = battle.slice(battle.indexOf('data-landscape-prompt'), battle.indexOf('data-landscape-prompt') + 500)
const promptKeys = [...promptBlock.matchAll(/t\('([\w.]+)'\)/g)].map(m => m[1])
ok('④-4 提示 JSX 里确实取了两条文案 key', promptKeys.length === 2)
for (const k of promptKeys) {
  ok(`④-4 key ${k} 在 zh.json 与 en.json 都存在`, zh.includes(`"${k}"`) && en.includes(`"${k}"`))
}

// ④-5 反向哨兵：旧的「请横过来玩」方向必须彻底消失（留着就说明只改了一半）
ok('④-5 ★ 旧文案「请横过来玩！」/ battle.landscape 必须已从 i18n 与 JSX 中移除（反向哨兵）',
  !zh.includes('请横过来玩') && !zh.includes('"battle.landscape"')
  && !en.includes('"battle.landscape"') && !battle.includes("t('battle.landscape')"))

console.log(`\n${fail === 0 ? '✅' : '⚠️'} test-responsive-tiers: 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
