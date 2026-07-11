#!/usr/bin/env node
// 抽卡「本期推荐」banner 守卫（2026-07-11，真机压测揪出的 key 格式迁移遗留）
//   selectBanner 按玩家闯关进度（stageStars 的 key）选章节 banner。历史上 selectBanner 用
//   `${ch}-` 前缀匹配，但关卡 id 早被统一迁成 `stage_X_Y` → 永久失配、恒回落 default，
//   齐齐从没见过推荐卡区块和 +50% 角标。本测试守住两点：
//     ① 行为：各章有星 → 选对应章 banner；0 星 / 空进度 → default；多章取最深。
//     ② 耦合：直接拿 campaignData 里真实的 stage id 喂 selectBanner —— 若将来又迁 key 格式，
//        banner 选择会立刻在这里炸，而不是像上次那样静默失效。
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { selectBanner, GACHA_BANNERS } from '../src/data/gachaBanners.js'
import { campaignData } from '../src/data/campaignData.js'

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }

// ── ① 行为断言（用迁移后真实 key 格式 stage_X_Y）──
ok('stage_1_1 有星 → ch1', selectBanner({ 'stage_1_1': 3 }).id === 'ch1')
ok('stage_2_1 有星 → ch2', selectBanner({ 'stage_2_1': 2 }).id === 'ch2')
ok('stage_3_5 有星 → ch3', selectBanner({ 'stage_3_5': 1 }).id === 'ch3')
ok('stage_4_2 有星 → ch4', selectBanner({ 'stage_4_2': 3 }).id === 'ch4')
ok('多章节取最深(ch1+ch3) → ch3', selectBanner({ 'stage_1_1': 3, 'stage_3_1': 1 }).id === 'ch3')
ok('0 星不算进展 → default', selectBanner({ 'stage_2_1': 0 }).id === 'default')
ok('空进度 → default', selectBanner({}).id === 'default')
ok('未知格式的 key → default（不误判）', selectBanner({ 'weird_key_9': 3 }).id === 'default')

// ── ② 耦合守卫：拿 campaignData 真实 stage id 反推期望章节 banner ──
// 章节 ch1-4 各取一个真实关卡 id，断言 selectBanner 认得它、且选到对应章。
for (const ch of [1, 2, 3, 4]) {
  const chapter = campaignData.chapters.find(c => c.id === `ch${ch}`)
  ok(`campaignData 有章节 ch${ch}`, !!chapter)
  const stage = chapter?.stages?.[0]
  ok(`ch${ch} 有关卡且 id 是 stage_ 前缀`, !!stage && /^stage_\d+_/.test(stage.id))
  if (stage) {
    const picked = selectBanner({ [stage.id]: 3 })
    // 关卡 id 形如 stage_<ch>_<n>，其章节数应与 banner ch 对上
    const chNum = stage.id.match(/^stage_(\d+)_/)?.[1]
    const expected = GACHA_BANNERS[`ch${chNum}`] ? `ch${chNum}` : 'default'
    ok(`真实关卡 ${stage.id} 有星 → banner ${expected}（key 格式没和 selectBanner 脱钩）`, picked.id === expected)
  }
}

// ── ③ 源码锚点：selectBanner 不得回退到坏掉的 `${ch}-` 前缀 ──
const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../src/data/gachaBanners.js'), 'utf8')
ok('selectBanner 用 stage_${ch}_ 前缀匹配', /startsWith\(`stage_\$\{ch\}_`\)/.test(src))
ok('selectBanner 不再用坏掉的 `${ch}-` 前缀', !/startsWith\(`\$\{ch\}-`\)/.test(src))

console.log(`\n${fail === 0 ? '✅' : '⚠️'} 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
