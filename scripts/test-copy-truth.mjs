#!/usr/bin/env node
// 「界面文案不许说谎」守卫（2026-08-23）
//
// 两类谎话，都是实测撞到的：
//
// ① **文案指向一个不存在的按钮**。首页重构把「🃏 卡组」合并进了「⚔️ 自由对战」（App 里那两行
//    本来就是同一个界面），但闯关关卡弹窗里还写着「去『🃏 卡组』创建你的专属卡组！」——
//    改代码时搜了引用，**没搜文案**。孩子照着找，找不到。
//
// ② **数字过期**。开场介绍页（齐齐读到的第一屏）写「60张卡牌」「17个关卡」，
//    而真实是图鉴 157 张、闯关 29 关。手写数字必然随内容漂移，所以这类数字一律**算出来**。
//
// 判据都是「和真实数据对账」，不是措辞品味。

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { campaignData } from '../src/data/campaignData.js'
import { TOTAL_DEX_CARDS } from '../src/data/dexSets.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }
const read = (p) => readFileSync(join(ROOT, p), 'utf8')
const code = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"'`\\])\/\/[^\n]*/gm, '$1')

const zh = JSON.parse(read('src/i18n/zh.json'))
const en = JSON.parse(read('src/i18n/en.json'))

// ============ ① 文案里「」引的界面名必须真实存在 ============
// 只挑**带 emoji** 的引用 —— 那是不会认错的「我在指界面上那个按钮」。
// ⚠️ 范围要覆盖扑克牌区 U+1F0A0–U+1F0FF —— 🃏（U+1F0CF）就在那儿，
//    第一版漏了它，`campaign.noDeck` 里的「🃏 卡组」直接没被抓到（幸好有下面那条防摆设断言）。
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u
const liveValues = (dict) => new Set(Object.values(dict).filter(v => typeof v === 'string'))

for (const [lang, dict] of [['zh', zh], ['en', en]]) {
  const live = liveValues(dict)
  const refs = []
  for (const [k, v] of Object.entries(dict)) {
    if (typeof v !== 'string') continue
    for (const m of v.matchAll(/[「『"]([^」』"]{2,20})[」』"]/g)) {
      if (EMOJI.test(m[1])) refs.push({ k, name: m[1] })
    }
  }
  ok(`① [${lang}] 至少抓到一处带 emoji 的界面引用（一处都没有 = 正则失效，下面这些就成了摆设）`,
    refs.length > 0 || lang === 'en')
  for (const { k, name } of refs) {
    // 真实存在 = 有某条现存文案**等于它**，或**以它开头**（允许引用时省略副标题）。
    // ☠️ 别再写反向的 name.startsWith(v)：i18n 里有空串（science.chineseOnly = ""），
    //    任何字符串都 .startsWith("")，整条断言会被撑成永远绿 —— 当场被变异测试抓到过。
    const exists = [...live].some(v => v.length >= 2 && (v === name || v.startsWith(name)))
    ok(`① ★ [${lang}] ${k} 指向的「${name}」在界面上真实存在（指一个已删/改名的按钮 = 让孩子白找）`,
      exists)
  }
}

// ============ ② 开场介绍页的数字必须算出来，不许手写 ============
for (const [lang, dict] of [['zh', zh], ['en', en]]) {
  for (const k of ['intro.feature.collectDesc', 'intro.feature.campaignDesc']) {
    const v = dict[k] || ''
    ok(`② ★ [${lang}] ${k} 用占位符 {n}，不写死数字（写死的必然随内容漂移）`,
      v.includes('{n}') && !/\d{2,}/.test(v.replace('{n}', '')))
  }
}
const intro = code(read('src/components/IntroModal.jsx'))
ok('② ★ IntroModal 的卡牌数来自图鉴真相源 TOTAL_DEX_CARDS', /TOTAL_DEX_CARDS/.test(intro))
ok('② ★ IntroModal 的关卡数从 campaignData 现算（不许再写一个常量）',
  /campaignData/.test(intro) && /stages\.length/.test(intro))
ok('② ★ 数字通过 {n} 传进文案', /intro\.feature\.collectDesc'?,\s*\{\s*n:/.test(intro)
  || /collectDesc[^)]*\{\s*n:/.test(intro))

// 真实数字对账（守卫自己也得知道现在到底是多少）
const stageCount = campaignData.chapters.reduce((n, ch) => n + ch.stages.length, 0)
ok(`② 图鉴真相源可用（当前 ${TOTAL_DEX_CARDS} 张）`, Number.isInteger(TOTAL_DEX_CARDS) && TOTAL_DEX_CARDS > 0)
ok(`② 闯关关卡数可现算（当前 ${stageCount} 关）`, stageCount > 0)

// ============ ③ 一键组卡要用**这一关推荐的阵营** ============
// 每关 playerConfig.recommendedFactions 数据早就有（ch3 有 nature/tech），但一键组卡
// 曾经永远先试 body+tech —— 第二章碰巧全是 body+tech 所以看不出来，到第三章就配不上。
{
  const withRec = campaignData.chapters.flatMap(ch => ch.stages)
    .filter(s => s.playerConfig?.recommendedFactions?.length)
  ok(`③ 关卡数据里确实带推荐阵营（${withRec.length} 关有）`, withRec.length >= 20)
  const nonBodyTech = withRec.filter(s => {
    const f = s.playerConfig.recommendedFactions
    return !(f.includes('body') && f.includes('tech'))
  })
  ok(`③ 确实存在**不是** body+tech 的关卡（${nonBodyTech.length} 关）—— 所以照搬默认组合会配不上`,
    nonBodyTech.length > 0)

  const app = code(read('src/App.jsx'))
  const db = code(read('src/components/DeckBuilder.jsx'))
  ok('③ ★ App 把这一关的推荐阵营传给卡组界面',
    /recommendedFactions=\{/.test(app) && /playerConfig\?\.recommendedFactions/.test(app))
  ok('③ ★ 卡组界面收下这个 prop', /recommendedFactions/.test(db))
  ok('③ ★ 一键组卡**先试**这一关推荐的组合（放在候选列表最前面）',
    /combos\s*=\s*\[[\s\S]{0,200}recommendedFactions/.test(db))
  ok('③ ★ 仍保留兜底组合（推荐阵营凑不满 25 时不能把人卡住）',
    /\['body', 'tech'\][\s\S]{0,120}\['nature', 'pathogen'\]/.test(db))
}

console.log(`\n${fail === 0 ? '✅' : '⚠️'} test-copy-truth: 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
