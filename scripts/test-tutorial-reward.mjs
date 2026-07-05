#!/usr/bin/env node
// 教学毕业奖励「只领一次」回归测试
// 修 bug：毕业礼包（+500 金币 + 免费十连抽=900 金币，共 1400）可反复刷——
//   重玩最后一关→「毕业」→「开始自由对战」会重回 handleTutorialGraduate，无幂等防护则每次都发。
//   注意：不能复用 tutorial.graduated 挡（它在进毕业画面前就已置 true）→ 用独立标记。
// 修法：App.jsx handleTutorialGraduate 改「先标记落盘（bio-heroes-tutorial-reward-claimed）再发放」。
// 本测试：① 纯逻辑复刻修复后的发奖，断言连刷 5 次只发 1400；② grep App.jsx 锚点防止防护被删回。
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }

const REWARD_KEY = 'bio-heroes-tutorial-reward-claimed'

// mock localStorage
const store = {}
const localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v } }

// 复刻 App.jsx handleTutorialGraduate 的**修复后逻辑**（先标记落盘、再发放）
function graduate(econ) {
  if (localStorage.getItem(REWARD_KEY)) return
  localStorage.setItem(REWARD_KEY, '1') // ★ 先标记落盘
  econ.coins += 500 // 毕业金币
  econ.coins += 900 // 免费十连抽（十连价 900）
}

// ① 连刷 5 次（模拟重玩最后一关→毕业→领奖）只发一次 1400
{
  delete store[REWARD_KEY]
  const econ = { coins: 0 }
  for (let i = 0; i < 5; i++) graduate(econ)
  ok('① 毕业领奖连刷 5 次：只发一次（1400，不叠加）', econ.coins === 1400)
}

// ② 首次领取后标记落盘
{
  delete store[REWARD_KEY]
  const econ = { coins: 0 }
  graduate(econ)
  ok('② 首次领取后 bio-heroes-tutorial-reward-claimed 已落盘', store[REWARD_KEY] === '1')
  ok('② 首次发放数额正确（500+900=1400）', econ.coins === 1400)
}

// ③ 已有标记（老玩家已领过 / 已刷过）→ 再进不发
{
  store[REWARD_KEY] = '1'
  const econ = { coins: 0 }
  graduate(econ)
  ok('③ 已有 claimed 标记 → 再进毕业画面不发奖', econ.coins === 0)
}

// ④ grep App.jsx 锚点：防护不被改回「无条件 addCoins」
{
  const app = readFileSync(join(ROOT, 'src/App.jsx'), 'utf8')
  // 抓 handleTutorialGraduate 函数体（到下一个 useCallback 结束的 }, [economy])）
  const m = app.match(/handleTutorialGraduate\s*=\s*useCallback\([\s\S]*?\},\s*\[economy\]\)/)
  ok('④ 找到 handleTutorialGraduate 定义', !!m)
  if (m) {
    const body = m[0]
    ok('④ 发奖前有 localStorage.getItem 幂等门（挡重复领取）',
      /localStorage\.getItem\(\s*['"]bio-heroes-tutorial-reward-claimed['"]\s*\)/.test(body) && /return/.test(body))
    ok('④ 标记 setItem 出现在 addCoins 之前（先标记落盘再发放）',
      body.indexOf('setItem') !== -1 &&
      body.indexOf('setItem') < body.indexOf('addCoins'))
  }
}

console.log(`\n${fail ? '❌' : '✅'} test-tutorial-reward: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
