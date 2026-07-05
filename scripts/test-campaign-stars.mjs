#!/usr/bin/env node
// 战役星数「已得 ≤ 总数」回归测试
// 修 bug（2026-07-05）：闯关屏右上角显示 ★ 92/87 —— 已得星 > 总星数（分子 > 分母）。
//   ① 源头：CampaignScreen 教学同步用旧格式 `1-${lvl}` 写星，而当前关卡 id 已是 `stage_1_${lvl}`
//      （loadCampaignProgress 迁移后）→ 旧格式写回成「幽灵 key」，与 stage_1_N 并存被双算。
//   ② 放大：getTotalStars 用 Object.values 数 stageStars 全部 key、getMaxStars 只数当前关卡
//      → 分子分母不同集合，幽灵 key 让 earned 超过 max。
// 修法：① 教学同步改写 stage_1_${lvl}；② getTotalStars 只统计当前关卡、每关封顶 3 星。
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const { getTotalStars, getMaxStars, campaignData } = await import(join(ROOT, 'src/data/campaignData.js'))

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }

const MAX = getMaxStars()
const allStageIds = campaignData.chapters.flatMap(ch => ch.stages.map(s => s.id))

// ① 全 3 星存档：earned == max（不多不少）
{
  const full = Object.fromEntries(allStageIds.map(id => [id, 3]))
  const earned = getTotalStars({ stageStars: full })
  ok(`① 全 3 星存档 earned(${earned}) == max(${MAX})`, earned === MAX)
}

// ② 幽灵 key（旧格式 1-N + 已删关卡）不计入 earned —— 这正是 92/87 的根源
{
  const withGhosts = { stage_1_1: 3, '1-1': 3, '1-2': 3, stage_removed_9: 3 }
  ok('② 旧格式 1-N / 已删关卡的幽灵 key 不计入 earned（只算 stage_1_1=3）',
    getTotalStars({ stageStars: withGhosts }) === 3)
}

// ③ 被幽灵 key 污染的存档：earned 恒 ≤ max（复刻 92/87 场景 —— 当前关卡全满 + 5 个 1-N 幽灵）
{
  const polluted = {
    ...Object.fromEntries(allStageIds.map(id => [id, 3])),
    '1-1': 3, '1-2': 3, '1-3': 3, '1-4': 3, '1-5': 3, junk_key: 99,
  }
  const earned = getTotalStars({ stageStars: polluted })
  ok(`③ 幽灵 key 污染下 earned(${earned}) ≤ max(${MAX})`, earned <= MAX)
  ok('③ 且恰等于 max（当前关卡全满，幽灵不加成）', earned === MAX)
}

// ④ 单关封顶 3 星（防某关被写入 >3 撑爆总数）
{
  ok('④ 单关 stars=15 也只按 3 计', getTotalStars({ stageStars: { stage_1_1: 15 } }) === 3)
}

// ⑤ 空 / 缺字段不抛
{
  ok('⑤ 空 stageStars → 0', getTotalStars({ stageStars: {} }) === 0)
  ok('⑤ 缺 stageStars 字段不抛 → 0', getTotalStars({}) === 0)
}

// ⑥ grep 锚点：教学同步写当前 id（stage_1_${lvl}），不再写旧格式（1-${lvl}）
{
  const cs = readFileSync(join(ROOT, 'src/components/CampaignScreen.jsx'), 'utf8')
  ok('⑥ 教学同步用当前 id stage_1_${lvl}', cs.includes('stage_1_${lvl}'))
  ok('⑥ 不再用旧格式 1-${lvl} 写星', !cs.includes('`1-${lvl}`'))
}

// ⑦ grep 锚点：getTotalStars 遍历当前关卡（防退回 Object.values 全 key 求和）
{
  const src = readFileSync(join(ROOT, 'src/data/campaignData.js'), 'utf8')
  const m = src.match(/export function getTotalStars[\s\S]*?\n}/)
  ok('⑦ getTotalStars 遍历 campaignData.chapters（非 Object.values(progress.stageStars)）',
    !!m && /campaignData\.chapters/.test(m[0]) && !/Object\.values\(progress\.stageStars\)/.test(m[0]))
}

// ⑧ grep 锚点：其它「用总星数」的地方也走 getTotalStars，别再内联 Object.values(stageStars) 全 key 求和
//    （否则幽灵 key 会让 ① 里程碑发奖提前 ② star_shine 成就提前解锁 —— 与显示 bug 同根）
{
  const app = readFileSync(join(ROOT, 'src/App.jsx'), 'utf8')
  const ach = readFileSync(join(ROOT, 'src/data/achievements.js'), 'utf8')
  ok('⑧ App.jsx 星数里程碑用 getTotalStars（非内联 Object.values(prog.stageStars)）',
    /getTotalStars\(prog\)/.test(app) && !/Object\.values\(prog\.stageStars\)/.test(app))
  ok('⑧ achievements star_shine 用 getTotalStars（非内联 Object.values(ctx.stageStars)）',
    /getTotalStars\(\{\s*stageStars/.test(ach) && !/Object\.values\(ctx\.stageStars/.test(ach))
}

console.log(`\n${fail ? '❌' : '✅'} test-campaign-stars: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
