#!/usr/bin/env node
// 「钻石抽卡」守卫（2026-08-30）
//
// 背景：钻石此前**一次都花不出去** —— `addDiamonds` 有、`spendDiamonds` 没有，
// `canAfford` 只看金币。而屏幕上（首页 + 抽卡界面两处）常驻显示 `💎 N`，闯关还专门
// 弹窗奖励「+10💎」。齐齐打通全部 29 关会攒下 90 颗，一颗都换不到东西 ——
// 这是「界面在说谎」里最直接的一种：数字在涨，但它什么都不是。
//
// 用途设计：**钻石 = 必出 SP 觉醒卡**。三条路互不重复 ——
//   金币 → 普通池（R68/SR25/SSR5/SP2）· SSR 券 → 下次必出 SSR · 钻石 → 必出 SP。
// 选 SP 的理由不是拍脑袋：`useGacha.js` 的注释白纸黑字记着「齐齐反馈"抽不到 SP"」，
// 当时的应对只是给了 2% 基础概率（平均 50 抽才见一张）。钻石给他一条**确定的**路。
//
// ☠️ 最大的坑（下面 ④ 专门钉死）：抽卡池里的 SP 卡，它们的 `rarity` 字段是 **'SSR'**。
//    而 `pullCards` 里写着 `if (card.rarity === 'SSR') newPity = 0` ——
//    钻石抽卡如果走默认路径，会把玩家**辛苦攒的金币池保底直接清零**。
//    不是"少加了一点"，是倒扣。

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import spCards from '../src/data/spCards.js'
import { campaignData } from '../src/data/campaignData.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }
const read = (p) => readFileSync(join(ROOT, p), 'utf8')
const code = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"'`\\])\/\/[^\n]*/gm, '$1')

const econ = code(read('src/hooks/useEconomy.js'))
const gacha = code(read('src/hooks/useGacha.js'))
const screen = code(read('src/components/GachaScreen.jsx'))

// ============ ① 病根必须消失：钻石得花得出去 ============
ok('① ★ useEconomy 有 spendDiamonds（此前只有 addDiamonds —— 只进不出）',
  /const spendDiamonds\s*=/.test(econ))
ok('① ★ spendDiamonds 被导出（不导出等于没有）', /^\s*spendDiamonds,/m.test(econ))
// ☠️ ①-2：守卫第一版漏了这条，结果**浏览器实测抽完钻石纹丝不动**才发现。
//    pullCards 是「读 stateRef.current → 重建整份 state → 覆盖式 setState」，
//    任何在它**之前**调用的扣款如果只用函数式 setState，updater 还没跑就被整份覆盖掉。
//    spendCoins 上方有一整段注释记着同一个坑（当年的症状是"抽卡不消耗金币"）——
//    同一个坑在这里原样复发了一次。判据：扣款函数体内必须出现 stateRef.current。
{
  const i = econ.indexOf('const spendDiamonds')
  const body = i < 0 ? '' : econ.slice(i, i + 400)
  ok('①-2 ★ spendDiamonds 用同步 stateRef 模式（只用函数式 setState 会被 pullCards 覆盖掉扣款）',
    /stateRef\.current/.test(body))
  const j = econ.indexOf('const spendCoins')
  ok('①-2 反向确认：spendCoins 也是这个模式（两条扣款路径必须一致）',
    j >= 0 && /stateRef\.current/.test(econ.slice(j, j + 400)))
}
ok('① ★ 有钻石版的余额检查 canAffordDiamonds（原 canAfford 只看金币）',
  /const canAffordDiamonds\s*=/.test(econ) && /^\s*canAffordDiamonds,/m.test(econ))
// ☠️ 这两条必须查**处理函数体内部**，不能只查"文件里出现过"——
//    按钮的 disabled / 样式也在调 canAffordDiamonds，把 handler 里的闸门整行删掉
//    仍然满足「文件里有」。变异测试当场抓到（M3 曾经不变红）。
const spHandler = (() => {
  const i = screen.indexOf('const doSpPull')
  return i < 0 ? '' : screen.slice(i, i + 1200)
})()
ok('① ★ 存在钻石抽卡的处理函数 doSpPull', spHandler.length > 100)
ok('① ★ **handler 内部**真的扣钻石（不扣 = 白抽，钻石永远不减）',
  /spendDiamonds\(/.test(spHandler))
ok('① ★ **handler 内部**先查余额再抽（只靠按钮 disabled 挡不住程序化调用）',
  /canAffordDiamonds\([^)]*\)\s*\)\s*return|!economy\.canAffordDiamonds/.test(spHandler))
ok('① 按钮本身也置灰（余额不足时不该看起来能点）',
  /disabled=\{[^}]*canAffordDiamonds/.test(screen))

// ============ ② 钻石抽卡必须**真的**必出 SP ============
// 承诺是「必出 SP」，就得跑真函数验证，不能只看有没有那行代码。
{
  // ☠️ 不能 `useGacha()` 再取 pullSp —— useCallback 在 Node 里没有 renderer，直接抛
  //    「Invalid hook call」。所以 SP 抽卡必须是**导出的纯函数**（和 RARITY_WEIGHTS 同样的处理），
  //    hook 只是薄薄包一层。这样守卫测到的就是线上跑的那一份。
  const mod = await import('../src/hooks/useGacha.js')
  const api = { pullSp: mod.rollSpCard }
  ok('② ★ useGacha.js 导出纯函数 rollSpCard（hook 包不住的东西测不了）',
    typeof mod.rollSpCard === 'function')
  if (typeof api.pullSp === 'function') {
    const gachaSpIds = new Set(spCards.filter(c => c.unlockMode === 'gacha').map(c => c.id))
    const campaignOnly = spCards.filter(c => c.unlockMode !== 'gacha').map(c => c.name)
    let notSp = 0, leaked = 0, seen = new Set()
    for (let i = 0; i < 300; i++) {
      const got = api.pullSp()
      const card = Array.isArray(got) ? got[0] : got
      if (!card || card._gachaSlot !== 'SP') { notSp++; continue }
      if (!gachaSpIds.has(card.id)) leaked++
      seen.add(card.id)
    }
    ok(`② ★ 300 次钻石抽卡**全部**是 SP 档（不是 SP 的 ${notSp} 次）`, notSp === 0)
    ok(`② ★ 绝不漏出闯关专属 SP（${campaignOnly.length} 张 campaign_only，漏出 ${leaked} 次）`
      + ' —— 这条既有规则不能因为新增入口被绕过', leaked === 0)
    ok(`② 池子确实随机（300 次抽到 ${seen.size} 种，池子共 ${gachaSpIds.size} 种）`,
      seen.size >= Math.min(5, gachaSpIds.size))
  }
}

// ============ ③ 钻石抽卡不许碰金币池的保底 ============
// ☠️ SP 卡的 rarity 字段是 'SSR'，而 pullCards 里 `card.rarity === 'SSR'` 会把 pity 清零。
//    照默认路径走，钻石抽一次 = 把金币池攒的保底倒扣光。
{
  const spRarities = new Set(spCards.map(c => c.rarity))
  ok(`③ 前提确认：SP 卡的 rarity 字段确实是 ${[...spRarities].join('/')}（所以才有这个坑）`,
    spRarities.has('SSR'))
  ok('③ ★ pullCards 支持「不推进保底」的调用方式（advancePity 选项）',
    /advancePity/.test(econ))
  ok('③ ★ 清零保底那行受 advancePity 保护（否则钻石抽卡把金币保底倒扣光）',
    /advancePity[\s\S]{0,200}newPity\s*=\s*0|newPity\s*=\s*advancePity\s*\?/.test(econ)
    || /if\s*\(\s*advancePity\s*&&[^)]*'SSR'/.test(econ))
  ok('③ ★ 钻石路径明确传 advancePity: false',
    /advancePity:\s*false/.test(screen))
}

// ============ ④ 经济：价格和「全游戏能拿到多少钻石」得对得上 ============
{
  let total = 10 // 新玩家初始
  for (const ch of campaignData.chapters) {
    total += ch.completionReward?.diamonds || 0
    for (const s of ch.stages) {
      total += s.rewards?.firstClear?.diamonds || 0
      total += s.rewards?.threeStars?.diamonds || 0
    }
  }
  const m = econ.match(/const SP_PULL_COST\s*=\s*(\d+)/)
  ok('④ ★ 定价常量 SP_PULL_COST 存在（价格得有单一真相源）', !!m)
  if (m) {
    const cost = +m[1]
    const times = Math.floor(total / cost)
    ok(`④ ★ 全游戏可得 ${total} 钻 ÷ ${cost} = 能抽 ${times} 次 —— 落在 2~6 次这个区间`
      + '（太少 = 攒了个寂寞，太多 = SP 不再稀有）', times >= 2 && times <= 6)
    ok(`④ 价格能整除总量或接近（${total} % ${cost} = ${total % cost}）—— 7 岁要算得清`,
      total % cost <= cost / 2)
  }
  ok('④ 钻石确实还有来源（改奖励时别把来源砍光了）', total >= 40)
}

// ============ ⑤ 界面接线 + 中英文 ============
ok('⑤ ★ 抽卡界面有钻石按钮（文案键 gacha.spPull）', /gacha\.spPull/.test(screen))
ok('⑤ ★ 钻石抽卡复用既有的动画/展示流程（不另起一套）',
  /setAnimatingCards\(/.test(screen) && /pullSp\(/.test(screen))
{
  const zh = JSON.parse(read('src/i18n/zh.json'))
  const en = JSON.parse(read('src/i18n/en.json'))
  for (const k of ['gacha.spPull', 'gacha.spPullHint', 'gacha.spPullLocked']) {
    ok(`⑤ i18n 键 ${k} 中英文都有`, typeof zh[k] === 'string' && typeof en[k] === 'string')
  }
  // 承诺必须写在按钮上 —— "必出" 是这次改动的全部卖点
  ok('⑤ ★ 中文文案里写明「必出 SP」（承诺不写出来，等于没有）',
    /必.*SP|SP.*必/.test(zh['gacha.spPull'] + zh['gacha.spPullHint']))
}

console.log(`\n${fail === 0 ? '✅' : '⚠️'} test-diamond-gacha: 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
