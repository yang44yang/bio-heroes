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
  const start = css.indexOf(padTier[0])
  const block = css.slice(start, start + 2600)
  for (const hook of ['data-field-area', 'data-hp-bar-area', 'data-pb-bar', 'data-vs-divider', 'data-top-bar']) {
    ok(`③ iPad 档压缩了 [${hook}]`, block.includes(hook))
  }
  // ③ 反向：绝不能在这一档里动 max-width（前人实测：放大 max-width 会把卡横向拉扁且字号不变）
  ok('③ iPad 档不得改 max-width（拉扁卡片的死路，见 SESSION.md 实测教训）',
    !/max-width/.test(block))
}

console.log(`\n${fail === 0 ? '✅' : '⚠️'} test-responsive-tiers: 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
