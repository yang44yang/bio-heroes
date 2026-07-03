#!/usr/bin/env node
// test-test-arena.mjs — 🧪 测试场（直接摆盘）接线守卫
// 功能纯 UI/hook 驱动、无法直接单测，用 source-grep 锁住"引擎支持 + 各处接线"不被后续重构静默删掉。
// 端到端行为已由 vite preview 实测（摆蜜蜂/大肠杆菌 → 满能量开局 → 预置卡立刻攻击、零 console error）。
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(ROOT, p), 'utf8')

let pass = 0, fail = 0
const ok = (n, c) => { if (c) pass++; else { fail++; console.error('❌ ' + n) } }

// ① 引擎：startBattle 支持 testPlayerField/testEnemyField 摆盘 + startEnergy
const ub = read('src/hooks/useBattle.js')
ok('① startBattle 支持满能量开局 (playerStartEnergy)', /setPlayerEnergy\(spDecks\.playerStartEnergy \|\| 1\)/.test(ub))
ok('① startBattle 处理 testPlayerField / testEnemyField 按格摆放',
  /testPlayerField.*setPlayerField.*testEnemyField.*setEnemyField/s.test(ub) && /makeFieldCard\(arr\[i\]\)/.test(ub))

// ② BattleScreen：接 testArenaConfig prop 并传给 startBattle
const bs = read('src/components/BattleScreen.jsx')
ok('② BattleScreen 接 testArenaConfig prop', /function BattleScreen\(\{[^}]*testArenaConfig/.test(bs))
ok('② BattleScreen 把 testArenaConfig 传进 startBattle',
  /testPlayerField:\s*testArenaConfig\?\.playerField/.test(bs) && /playerStartEnergy:\s*testArenaConfig\?\.startEnergy/.test(bs))

// ③ App：state + 退出守卫(不计战绩) + testArena 屏 + 传 prop
const app = read('src/App.jsx')
ok('③ App 有 testArenaConfig state + ref', /const \[testArenaConfig, setTestArenaConfig\]/.test(app) && /testArenaConfigRef\.current = testArenaConfig/.test(app))
ok('③ handleExitBattle 对测试场对战直接清配置回主菜单（不计战绩）', /if \(testArenaConfigRef\.current\)/.test(app))
ok('③ 渲染 testArena 屏 + 传 testArenaConfig 给 BattleScreen',
  /screen === 'testArena'/.test(app) && /testArenaConfig=\{testArenaConfig\}/.test(app))

// ④ TitleScreen：家长门后的测试场入口
const ts = read('src/components/TitleScreen.jsx')
ok('④ TitleScreen 有走家长门的测试场入口', /handleOpenTestArena/.test(ts) && /onOpenTestArena/.test(ts) && /!== '56'/.test(ts))

// ⑤ TestArena 组件存在且产出 {playerField, enemyField, startEnergy}
ok('⑤ TestArena.jsx 存在', existsSync(join(ROOT, 'src/components/TestArena.jsx')))
if (existsSync(join(ROOT, 'src/components/TestArena.jsx'))) {
  const ta = read('src/components/TestArena.jsx')
  ok('⑤ TestArena onStart 产出 playerField/enemyField/startEnergy',
    /onStart\(\{[\s\S]*playerField[\s\S]*enemyField[\s\S]*startEnergy/.test(ta))
  ok('⑤ TestArena 从全角色卡池取卡（type===character）', /cards\.filter\(\(c\) => c\.type === 'character'\)/.test(ta))
}

console.log(`\n${fail === 0 ? '✅' : '⚠️'} test-test-arena: 通过 ${pass}/${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
