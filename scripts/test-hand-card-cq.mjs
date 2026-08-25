#!/usr/bin/env node
// 「事件卡统一到 cqh」守卫（2026-08-23）
//
// 背景（实测，附数字）：P1 A 把**战场卡**的卡内排版全部改成 cqh —— 「内容总高 = 常数 × 卡高」，
// 于是结构上不可能溢出。P1 B 又把**手牌卡的外框**锁成 5:7。但**卡内**从来没跟着走：
// 手牌卡的字号仍是固定 px，而事件卡的 `effectDescription` 长度不受控、**也没有行数封顶**，
// 内容高度随文案长度线性增长 → 卡框固定、内容不封顶 = 必然溢出。
//
// iPad 横屏 1024×768 实测（卡框仅 115px 高，齐齐主要玩这个姿势）：
//   生物卡「猎豹」内容离卡底还有 11px；
//   事件卡「发烧反应」溢出 **43px**、「干细胞分化」**54px**、「基因突变」(54 字) **77px**
//   —— 文字整片压到卡外、盖住底部状态栏（截图为证）。768×1024 竖屏下「基因突变」也溢出 4px。
// 另：**换卡弹窗**里的卡没有任何尺寸约束，事件卡被文案撑成 251×105（比例 2.39，横躺的大块），
//   而生物卡是 81×96 —— 每局开场第一屏就不统一。
//
// 本守卫钉死的是**不变量**，不是具体像素：
//   卡内尺寸必须是 cqh（跟卡走）· 必须有 px 下限（儿童可读性底线）· 事件卡描述必须有行数封顶
//   （否则"无界内容 + 有界容器"这个病根还在）· 系数之和 < 100（"结构上不可能溢出"的算术证明）。

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import eventCards from '../src/data/eventCards.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }
const read = (p) => readFileSync(join(ROOT, p), 'utf8')
const stripJs = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"'`\\])\/\/[^\n]*/gm, '$1')

const css = read('src/index.css').replace(/\/\*[\s\S]*?\*\//g, '')   // CSS 只有块注释
const card = stripJs(read('src/components/Card.jsx'))
const battle = stripJs(read('src/components/BattleScreen.jsx'))

// ============ ① 事件卡描述必须有 cq 钩子 ============
ok('① ★ Card.jsx 的事件卡描述带 data-cq="eventdesc"（没钩子 = CSS 够不着它）',
  /data-cq="eventdesc"/.test(card))
// SP 触发行也是「无钩子的固定 px」：115px 的卡上白占 15.5px（实测），是最后 2px 溢出的来源之一
ok('① ★ 事件卡的「可触发SP」行也带钩子 data-cq="sptrigger"', /data-cq="sptrigger"/.test(card))
ok('① 生物卡那几行的钩子仍在（别改着改着把老的弄丢）',
  ['icon', 'name', 'faction', 'hpbar', 'hptext', 'stats', 'factionreq']
    .every(k => card.includes(`data-cq="${k}"`)))

// ============ ② 手牌卡 / 换卡弹窗的卡都要成为 size 容器 ============
// ☠️ cqh 必须有 size 容器祖先，否则**静默回退成视口单位**（svh）—— 本地看着对、真机全歪。
//    这是 P1 A 注释里记的坑，同一个坑在这里会复发。
ok('② ★ 存在统一标记 data-cq-card（手牌与换卡弹窗共用同一套卡内排版）',
  /\[data-cq-card\]/.test(css))
ok('② ★ data-cq-card 是**命名 size 容器**（cqh 才有意义）',
  /\[data-cq-card\][^{]*\{[^}]*container:\s*[a-z-]+\s*\/\s*size/.test(css))
ok('② ★ 手牌卡带 data-cq-card', /data-cq-card="true"/.test(battle) && /data-hand-card="true"/.test(battle))
const mulliganIdx = battle.indexOf('mulligan.title')
const mulliganBlock = mulliganIdx >= 0 ? battle.slice(mulliganIdx, mulliganIdx + 2000) : ''
ok('② ★ 换卡弹窗里的卡也带 data-cq-card（它是每局开场第一屏）',
  /data-cq-card="true"/.test(mulliganBlock))
ok('② ★ 换卡弹窗的卡有**定尺寸的 5:7 框**（原来完全由内容决定，事件卡被撑成 2.39 的横条）',
  /aspect-\[5\/7\]/.test(mulliganBlock))

// ============ ③ 卡内每一行都要 cqh + px 下限 ============
const cqRules = [...css.matchAll(/\[data-cq-card\]\s*\[data-cq="([a-z]+)"\][^{]*\{([^}]*)\}/g)]
  .map(m => ({ row: m[1], body: m[2] }))
ok(`③ ★ data-cq-card 作用域下有卡内排版规则（实有 ${cqRules.length} 条）`, cqRules.length >= 5)
for (const { row, body } of cqRules) {
  ok(`③ ★ [${row}] 用 cqh（跟卡走，不是固定 px）`, /\d+(\.\d+)?cqh/.test(body))
  ok(`③ [${row}] 有 px 下限 max(…px, …cqh)（卡再小字也不能小到看不清 —— 儿童可读性底线）`,
    /max\(\s*\d+px\s*,/.test(body))
}
for (const must of ['icon', 'name', 'eventdesc', 'sptrigger']) {
  ok(`③ ★ 关键行 [${must}] 在这套规则里`, cqRules.some(r => r.row === must))
}

// ============ ④ 事件卡描述必须**行数封顶** ============
// 病根是「无界内容 + 有界容器」。只把字号改成 cqh 不够 —— 54 字的文案行数仍随长度增长。
const evd = cqRules.find(r => r.row === 'eventdesc')?.body || ''
ok('④ ★ eventdesc 有行数封顶（line-clamp）—— 这才是把内容高度变成常数的那一刀',
  /line-clamp:\s*\d+/.test(evd))
ok('④ ★ eventdesc 覆盖掉组件里的 min-height（Tailwind 的 min-h-[16px]/[24px] 会把下限撑回去）',
  /min-height:\s*0/.test(evd))
ok('④ 封顶行数是个小数字（封到 6 行以上等于没封）',
  (() => { const m = evd.match(/line-clamp:\s*(\d+)/); return m && +m[1] >= 2 && +m[1] <= 5 })())

// ============ ⑤ 算术证明：系数之和 < 100 ============
// 「内容总高 = 常数 × 卡高」只有在系数和 < 100 时才真的不溢出。这条是那句话的证明，不是感觉。
{
  const coef = (row) => {
    const b = cqRules.find(r => r.row === row)?.body || ''
    const m = b.match(/(\d+(?:\.\d+)?)cqh/)
    return m ? +m[1] : 0
  }
  const lines = +((evd.match(/line-clamp:\s*(\d+)/) || [])[1] || 0)
  const lh = +((evd.match(/line-height:\s*(\d+(?:\.\d+)?)/) || [])[1] || 1.25)
  // 事件卡的行：图标 + 名称 + 阵营名 + 描述(行数×行高) + SP 触发行（用真实系数，不再拿名称行估）
  const eventTotal = coef('icon') + coef('name') + coef('faction') + coef('eventdesc') * lines * lh + coef('sptrigger')
  ok(`⑤ ★ 事件卡各行 cqh 系数之和 = ${eventTotal.toFixed(1)} < 100（留白之外还要有余量）`,
    eventTotal > 0 && eventTotal < 85)
  const creatureTotal = coef('icon') + coef('name') + coef('faction') + coef('hpbar') + coef('stats')
  ok(`⑤ 生物卡各行之和 = ${creatureTotal.toFixed(1)} < 100`, creatureTotal > 0 && creatureTotal < 85)
}

// ============ ⑥ 反向锁：别把病根改回去 ============
ok('⑥ ★ Card.jsx 的事件卡描述不得再依赖写死的 min-h 撑高度（改用 cq 规则控制）',
  !/min-h-\[16px\]\s+sm:min-h-\[24px\]/.test(card) || /data-cq="eventdesc"/.test(card))
ok('⑥ 战场卡那套 P1 A 规则原封不动（本次只加手牌/换卡作用域，不许顺手改战场）',
  /\[data-field-area\]\s*\[data-cq="icon"\][\s\S]{0,40}font-size:\s*max\(12px,\s*15cqh\)/.test(css))

// ============ ⑥-2 矮卡降级阈值必须真的盖住横屏档 ============
// 横屏手牌卡高 110~115px。抬高 px 下限后 3 行描述在那两档余量压到 0（内容底边正好贴卡底），
// 靠降级到 2 行才拿回 ~12px。阈值低于 115 就等于没降级。
{
  const m = css.match(/@container\s+bh-card\s*\(max-height:\s*(\d+)px\)/)
  ok(`⑥-2 ★ 存在 bh-card 矮卡降级块（阈值 ${m ? m[1] + 'px' : '缺失'}）`, !!m)
  ok('⑥-2 ★ 降级阈值 ≥115px（要盖住 iPad 横屏那两档 110/115，否则事件卡余量归零）',
    !!m && +m[1] >= 115)
  const deg = css.slice(css.indexOf('@container bh-card'), css.indexOf('@container bh-card') + 400)
  ok('⑥-2 ★ 降级时描述收到更少的行数', /line-clamp:\s*2/.test(deg))
}

// ============ ⑦ 真实数据：最长的事件卡文案确实会撑爆无封顶的布局 ============
{
  const lens = eventCards.map(c => (c.effectDescription || '').length).sort((a, b) => b - a)
  ok(`⑦ 事件卡文案长度差异巨大（最长 ${lens[0]} 字 / 最短 ${lens[lens.length - 1]} 字）——`
    + ' 所以「按最长的排版」行不通，必须封顶',
    lens[0] >= 40 && lens[0] / Math.max(1, lens[lens.length - 1]) >= 3)
}

console.log(`\n${fail === 0 ? '✅' : '⚠️'} test-hand-card-cq: 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
