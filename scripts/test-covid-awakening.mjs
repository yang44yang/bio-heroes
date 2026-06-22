#!/usr/bin/env node
// 变异株觉醒(covid_boss.onHPThreshold)空响 bug 回归测试
// 跟 test-gene-correction 同款: 避开 import bossMechanics(deckRules 路径 ESM 严格模式拒),
// 改成 grep 源码 + 内联 mock executor 跑行为
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }

// ---- 1. 源码层：bossMechanics covidBoss.onHPThreshold 含活体检测 ----
const src = readFileSync(join(ROOT, 'src/engine/bossMechanics.js'), 'utf8')
const onHPIdx = src.indexOf('onHPThreshold({')
const covidBlock = src.slice(onHPIdx, onHPIdx + 1500)
ok('covidBoss.onHPThreshold 含 covid_invader 活体检测', /covidAlive\s*=\s*enemyField\.some/.test(covidBlock))
ok('检测条件正确(id===covid_invader && currentHp>0)',
   /c\.id\s*===\s*'covid_invader'/.test(covidBlock) && /currentHp\s*>\s*0/.test(covidBlock))
ok('!covidAlive 分支早返回 events:[] dialogue:bossHalfHP',
   /!covidAlive[\s\S]{0,300}events:\s*\[\][\s\S]{0,100}dialogue:\s*'bossHalfHP'/.test(covidBlock))
ok('phase 早返回前已置 2(避免漏推进)', /bossState\.phase\s*=\s*2/.test(covidBlock.slice(0, covidBlock.indexOf('covidAlive'))))

// ---- 2. 内联 mock executor (与修复后逻辑完全同步) 跑 4 种场景 ----
function onHPThresholdMock({ currentHP, maxHP, enemyField, setEnemyField, addLog, bossState }) {
  if (bossState.phase >= 2) return { events: [], dialogue: null }
  const ratio = currentHP / maxHP
  if (ratio >= 0.5) return { events: [], dialogue: null }
  bossState.phase = 2
  const covidAlive = enemyField.some(c => c && c.currentHp > 0 && c.id === 'covid_invader')
  if (!covidAlive) return { events: [], dialogue: 'bossHalfHP' }
  setEnemyField(prev => prev.map(c => {
    if (c && c.id === 'covid_invader' && c.currentHp > 0) return { ...c, atk: c.atk + 2000 }
    return c
  }))
  addLog('💀 变异株觉醒！新冠病毒 ATK +2000！')
  return {
    events: [{ type: 'BOSS_EVENT', text: '💀 变异株觉醒！ATK+2000', color: 'text-red-500' }],
    dialogue: 'bossHalfHP',
  }
}

function scenario({ phase = 1, ratio = 0.4, covidAlive = true }) {
  const logs = []
  const fieldUpdates = []
  const bossState = { phase }
  const enemyField = covidAlive
    ? [{ id: 'covid_invader', currentHp: 5000, atk: 3000 }]
    : [{ id: 'covid_clone', currentHp: 1500, atk: 1500 }] // 只有副本(id 不是 covid_invader)
  const result = onHPThresholdMock({
    currentHP: ratio * 100, maxHP: 100,
    enemyField,
    setEnemyField: (fn) => { fieldUpdates.push(fn(enemyField)) },
    addLog: (msg) => { logs.push(msg) },
    bossState,
  })
  return { result, logs, fieldUpdates, bossState }
}

// 场景 1: 有活 covid_invader → 正常觉醒
const s1 = scenario({ covidAlive: true, ratio: 0.4 })
ok('S1 events 含一条 BOSS_EVENT', Array.isArray(s1.result.events) && s1.result.events.length === 1)
ok('S1 触发剧情对话 bossHalfHP', s1.result.dialogue === 'bossHalfHP')
ok('S1 addLog 弹了"变异株觉醒"', s1.logs.length === 1 && /变异株觉醒/.test(s1.logs[0]))
ok('S1 推进 phase 2', s1.bossState.phase === 2)
ok('S1 covid_invader atk +2000 (3000 → 5000)', s1.fieldUpdates[0]?.[0]?.atk === 5000)

// 场景 2 (核心修复): 场上无 covid_invader → 静默推进
const s2 = scenario({ covidAlive: false, ratio: 0.4 })
ok('S2 events 为空(不弹空响动画)', s2.result.events.length === 0)
ok('S2 仍触发对话(boss 主人台词)', s2.result.dialogue === 'bossHalfHP')
ok('S2 不 addLog (空响修复)', s2.logs.length === 0)
ok('S2 推进 phase 2(避免重复检测)', s2.bossState.phase === 2)
ok('S2 不调 setEnemyField (没目标)', s2.fieldUpdates.length === 0)

// 场景 3: HP 未到 50% → 完全不触发
const s3 = scenario({ covidAlive: true, ratio: 0.7 })
ok('S3 events 空', s3.result.events.length === 0)
ok('S3 dialogue null', s3.result.dialogue === null)
ok('S3 不 addLog', s3.logs.length === 0)
ok('S3 phase 保持 1', s3.bossState.phase === 1)

// 场景 4: phase 已 ≥2 → 不再触发(幂等)
const s4 = scenario({ phase: 2, covidAlive: true, ratio: 0.3 })
ok('S4 phase≥2 → events 空', s4.result.events.length === 0)
ok('S4 phase≥2 → dialogue null', s4.result.dialogue === null)
ok('S4 phase≥2 → 不 addLog', s4.logs.length === 0)
ok('S4 phase 保持 2', s4.bossState.phase === 2)

console.log(`\n${fail === 0 ? '✅' : '⚠️'} 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
