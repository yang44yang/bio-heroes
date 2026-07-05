#!/usr/bin/env node
// 闯关战役奖励「只领一次」回归测试
// 修 bug：某关可反复刷首通奖励（退回地图→重进→再赢→又领 1400）。根因是「已领标记」
//   没能可靠落盘（旧写法先发放、最后才 saveCampaignProgress，中途异常/打断就丢标记）。
// 修法：App.jsx 里改「先标记+立即存盘，再发放」；loadCampaignProgress 兜底 claimedRewards。
// 本测试：① 纯函数驱动 load/save 断言首通只发一次、重进跳过、老档兜底；
//         ② grep App.jsx 锚点断言「存盘在发放之前」的顺序不被改回。
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

// mock localStorage（必须在 import campaignData 前装好）
const store = {}
globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v } }
const { loadCampaignProgress, saveCampaignProgress } = await import(join(ROOT, 'src/data/campaignData.js'))
const KEY = 'bio-heroes-campaign'

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }

// 复刻 App.jsx handleExitBattle 奖励段的**修复后顺序**（先标记+存盘，再发放）
function clearStage(stageConfig, stars, econ) {
  const prog = loadCampaignProgress()
  prog.claimedRewards = prog.claimedRewards || {}
  const grants = []
  const rewardKey = `${stageConfig.stageId}_first`
  if (!prog.claimedRewards[rewardKey]) {
    prog.claimedRewards[rewardKey] = true
    const r = stageConfig.rewards.firstClear
    if (r?.coins) grants.push(() => econ.coins += r.coins)
  }
  if (stars >= 3) {
    const threeKey = `${stageConfig.stageId}_three`
    if (!prog.claimedRewards[threeKey]) {
      prog.claimedRewards[threeKey] = true
      const r = stageConfig.rewards.threeStars
      if (r?.coins) grants.push(() => econ.coins += r.coins)
    }
  }
  prog.stageStars[stageConfig.stageId] = Math.max(prog.stageStars[stageConfig.stageId] || 0, stars)
  saveCampaignProgress(prog)         // ★ 先存盘
  for (const g of grants) g()        // 再发放
}

const stage = { stageId: 'stage_4_4', rewards: { firstClear: { coins: 1400 }, threeStars: { coins: 700 } } }

// ① 首通只发一次：连打 5 次（模拟退回地图重进再赢），只在第一次拿 1400+700
{
  delete store[KEY]
  const econ = { coins: 0 }
  for (let i = 0; i < 5; i++) clearStage(stage, 3, econ)
  ok('① 重进同一关 5 次：首通+三星只发一次（1400+700=2100，不叠加）', econ.coins === 2100)
}

// ② 首通标记落盘：第一次后 localStorage 里就有 stage_4_4_first
{
  delete store[KEY]
  const econ = { coins: 0 }
  clearStage(stage, 3, econ)
  const saved = JSON.parse(store[KEY])
  ok('② 首通后 claimedRewards.stage_4_4_first 已落盘', saved.claimedRewards?.stage_4_4_first === true)
  ok('② 首通后 threeStars 标记已落盘', saved.claimedRewards?.stage_4_4_three === true)
}

// ③ 老档兜底：缺 claimedRewards 的 v2 存档 load 后不抛、且补出 claimedRewards={}
{
  store[KEY] = JSON.stringify({ _idMigrationVersion: 2, stageStars: { stage_4_4: 3 } }) // 无 claimedRewards
  const prog = loadCampaignProgress()
  ok('③ 缺 claimedRewards 的老档 → 兜底为 {}', prog.claimedRewards && typeof prog.claimedRewards === 'object')
  ok('③ 缺 stageStars 的兜底同理（读属性不抛）', prog.stageStars && typeof prog.stageStars === 'object')
  // 且在该老档上首通仍只发一次
  const econ = { coins: 0 }
  clearStage(stage, 3, econ)  // 之前没领过 → 发一次
  clearStage(stage, 3, econ)  // 重进 → 跳过
  ok('③ 老档补兜底后：首通仍只发一次', econ.coins === 2100)
}

// ④ 迁移一次性 + 键随迁移映射（老 4-3 = 现 stage_4_4）
{
  store[KEY] = JSON.stringify({ stageStars: { '4-3': 3 }, claimedRewards: { '4-3_first': true } }) // v0
  const prog = loadCampaignProgress()
  ok('④ 老 4-3 存档迁移后 claimedRewards 映射到 stage_4_4_first', prog.claimedRewards?.stage_4_4_first === true)
  const econ = { coins: 0 }
  clearStage(stage, 1, econ)  // 已领（迁移后）→ 跳过
  ok('④ 迁移后已领的关：重打不再发首通', econ.coins === 0)
}

// ⑤ grep App.jsx：修复顺序「先存盘、后发放」的结构锚点（防被改回）
{
  const app = readFileSync(join(ROOT, 'src/App.jsx'), 'utf8')
  // 抓 handleExitBattle campaign 分支段（pendingGrants 到其后首个 campaignStageRef 清空）
  const startIdx = app.indexOf('const pendingGrants')
  const seg = app.slice(startIdx, app.indexOf('campaignStageRef.current = null', startIdx))
  const saveIdx = seg.indexOf('saveCampaignProgress(prog)')
  const grantIdx = seg.indexOf('for (const grant of pendingGrants)')
  ok('⑤ 发放推迟进 pendingGrants（不再当场 addCoins）', /pendingGrants\.push\(\(\)\s*=>\s*economy\.addCoins/.test(seg))
  ok('⑤ saveCampaignProgress 在发放循环之前（先落盘后发放）', saveIdx >= 0 && grantIdx >= 0 && saveIdx < grantIdx)
  ok('⑤ 首通标记后才 push 发放（标记与发放解耦）', /prog\.claimedRewards\[rewardKey\] = true/.test(seg))
}

console.log(`\n${fail === 0 ? '✅' : '⚠️'} campaign-rewards 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
