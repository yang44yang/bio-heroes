#!/usr/bin/env node
// 进化系统完整性校验（决策2 止血 + 防再断头，2026-06-29）
//   背景：17 张卡声明了非空 evolutionTo，但只有 3 个目标卡真实存在、且只有 2 条链接进了
//        EVOLUTION_CHAINS（进化 UI 唯一真相源 getEvolutionTarget）。其余 14 个是"逐季补全"的
//        计划目标（决策2）。卡上的 evolutionTo 字符串目前是元数据，不直接驱动进化流程，
//        所以不是"进化成虚空"的活 bug；但若无校验，未来手滑写错目标名/造了链却忘登记 = 静默断头。
//   本测试守三件事：
//     ① EVOLUTION_CHAINS 里每个 step.cardId 都是真卡；实现链的 source.evolutionTo == 下一步卡名。
//     ② 每个非空 evolutionTo 的目标：要么是已存在的卡，要么在 PLANNED_EVOLUTIONS 白名单（计划中）。
//        二者皆非 = 报错（抓新增的死目标/拼写错）。
//     ③ "看着实现了其实没接线"也算断头：evolutionTo 指向真卡的源卡，必须真能 getEvolutionTarget。
//     ④ 白名单保持诚实：planned 名不能已经是真卡（造好了要从 planned 移除），且每个 planned 名
//        必须真的被某张卡的 evolutionTo 引用（无僵尸条目）。
import cards from '../src/data/cards.js'
import { EVOLUTION_CHAINS, getEvolutionTarget } from '../src/data/evolutions.js'

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }

const byId = Object.fromEntries(cards.map(c => [c.id, c]))
const cardNames = new Set(cards.map(c => c.name))

// 计划中的进化目标（决策2：逐季补全 14 张 = nature5/body3/pathogen3/tech3）。
// 造出对应卡后 → 把它接进 EVOLUTION_CHAINS 并从此处移除。
const PLANNED_EVOLUTIONS = new Set([
  // nature
  '蚁群·百万军团', '蜂群·万刺风暴', '箱形水母·致命蓝焰', '世界树·生命之源', '电鳗·雷霆之王',
  // body
  '血红蛋白·超级载体', '巨噬细胞·终极吞噬者', '大脑皮层·意识之海',
  // pathogen
  'H5N1·超级毒株', '牙周病菌·骨骼侵蚀者', '超级细菌·耐药终结者',
  // tech
  'MRI·全身透视仪', '电子显微镜·纳米之眼', '达芬奇机器人·全自动手术台',
])

// ===== ① EVOLUTION_CHAINS 自身完整：step 卡都存在；实现链 evolutionTo 与下一步一致 =====
for (const ch of EVOLUTION_CHAINS) {
  for (let i = 0; i < ch.steps.length; i++) {
    ok(`链 ${ch.id} step[${i}] cardId=${ch.steps[i].cardId} 是真卡`, !!byId[ch.steps[i].cardId])
  }
  for (let i = 0; i < ch.steps.length - 1; i++) {
    const cur = byId[ch.steps[i].cardId], nxt = byId[ch.steps[i + 1].cardId]
    ok(`链 ${ch.id}: ${cur?.name}.evolutionTo == 下一步「${nxt?.name}」`,
      !!cur && !!nxt && cur.evolutionTo === nxt.name)
  }
}

// ===== ②③ 每个非空 evolutionTo 的健康检查 =====
const referencedPlanned = new Set()
let declared = 0, implemented = 0, planned = 0
for (const c of cards) {
  if (!c.evolutionTo) continue
  declared++
  const targetExists = cardNames.has(c.evolutionTo)
  const isPlanned = PLANNED_EVOLUTIONS.has(c.evolutionTo)
  // ② 目标必须 存在 或 计划中（既非则断头）
  ok(`${c.name} 的 evolutionTo「${c.evolutionTo}」存在或已登记 planned`, targetExists || isPlanned)
  if (targetExists) {
    implemented++
    // ③ 指向真卡 → 必须真接进了进化链（否则进化按钮永不出现 = 静默死目标）
    ok(`${c.name} 进化目标已存在 → getEvolutionTarget 接线（非僵尸目标）`, getEvolutionTarget(c.id) != null)
  } else if (isPlanned) {
    planned++
    referencedPlanned.add(c.evolutionTo)
  }
}

// ===== ④ 白名单卫生 =====
for (const name of PLANNED_EVOLUTIONS) {
  ok(`planned「${name}」尚未变成真卡（造好须移出 planned）`, !cardNames.has(name))
  ok(`planned「${name}」确被某张卡 evolutionTo 引用（无僵尸条目）`, referencedPlanned.has(name))
}

console.log(`\n声明 evolutionTo: ${declared}（已实现 ${implemented} / 计划中 ${planned}）；EVOLUTION_CHAINS: ${EVOLUTION_CHAINS.length} 条`)
console.log(`${fail === 0 ? '✅' : '⚠️'} 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
