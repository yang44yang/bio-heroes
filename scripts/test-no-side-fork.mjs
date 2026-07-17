// test-no-side-fork.mjs —— 棘轮：让 de-fork 保持 de-forked。
//
// 为什么有这个文件：
//   S0-S6 把「玩家一套规则 / AI 另一套」合并成了一条 side 参数化的路。但没有棘轮，
//   它会在第一次「AI 要快速调一下」时腐化 —— **现在这个 fork 就是这么生出来的**。
//   CLAUDE.md 里那条项目规矩「改战斗规则须玩家/AI 两处同步改」本身就是这个 fork 的伤疤；
//   de-fork 是**删掉那条规矩**，而不是更用力地遵守它。这个文件保证它删得掉。
//
// ⚠️ **棘轮单独是不够的。** 它只能证明 rules.js **不能命名**某一侧，证明不了它
//   「拿了 side 又忽略它」（比如 `state[总是player的变量]`）。那个由
//   scripts/test-side-symmetry.mjs 的镜像测试覆盖。**两个一起上，否则守卫就是剧场。**
//
// ⚠️ **必须剥掉注释再扫。** battleReducer.js 的文件头自己记着：scripts/test-field-slots.mjs
//   这个 source-grep 守卫**已经**把注释里的示例字面量当成过真代码。而 rules.js 的注释里
//   密集地讨论 'player'/'enemy'（它整个存在理由就是解释这件事），裸正则会立刻咬住自己的说明文字。

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(root, p), 'utf8')

let pass = 0
const fails = []
const assert = (cond, msg) => { if (cond) pass++; else fails.push(msg) }

/**
 * 剥掉 // 行注释、/* 块注释 *\/ 与字符串外的空白，只留可执行代码。
 * 朴素但够用：本仓库无 regex 字面量里含 // 的写法（已核）。
 */
function stripComments(src) {
  let out = ''
  let i = 0
  let mode = 'code' // code | line | block | sq | dq | tpl
  while (i < src.length) {
    const c = src[i], n = src[i + 1]
    if (mode === 'code') {
      if (c === '/' && n === '/') { mode = 'line'; i += 2; continue }
      if (c === '/' && n === '*') { mode = 'block'; i += 2; continue }
      if (c === "'") mode = 'sq'
      else if (c === '"') mode = 'dq'
      else if (c === '`') mode = 'tpl'
      out += c; i++; continue
    }
    if (mode === 'line') { if (c === '\n') { mode = 'code'; out += c } ; i++; continue }
    if (mode === 'block') { if (c === '*' && n === '/') { mode = 'code'; i += 2 } else i++; continue }
    // 字符串内：原样保留，处理转义与收尾
    out += c
    if (c === '\\') { out += src[i + 1] ?? ''; i += 2; continue }
    if ((mode === 'sq' && c === "'") || (mode === 'dq' && c === '"') || (mode === 'tpl' && c === '`')) {
      // 收尾引号（开头那个已在 code 分支写过，这里是结束）
      if (out.length > 1) mode = 'code'
    }
    i++
  }
  return out
}

// 自检：剥注释器本身得是对的，否则棘轮全是空转（这正是「守卫即剧场」的样子）
{
  const sample = `
    // 注释里写 'player' 不算
    /* 块注释里写 'enemy' 也不算 */
    const a = 'player'   // 但这个算
    const msg = "含 'enemy' 的字符串算"
  `
  const s = stripComments(sample)
  assert(!s.includes('注释里写'), '⓪ 剥注释器：行注释被剥掉')
  assert(!s.includes('块注释里'), '⓪ 剥注释器：块注释被剥掉')
  assert(s.includes("const a = 'player'"), '⓪ 剥注释器：代码里的字面量保留')
  assert(s.includes('含'), '⓪ 剥注释器：字符串内容保留')
}

// ---- (a) rules.js 不得**命名**某一侧 ----
// 这不是空想：我 grep 过，engine/{combat,aiTarget,statusEffects,stageRules,bossMechanics}
// 与 utils/{damage,guardSkill,factionMarkers} **今天已经全部零侧别字面量**。
// side-blindness 早就是 src/engine 的事实房规，只是没人写下来。本条把它写下来并延伸到 rules.js。
// 一个**不能命名某一侧的模块，在结构上就无法偏袒某一侧** —— 这比测试更接近结构定理。
{
  const code = stripComments(read('src/engine/rules.js'))
  const hits = [...code.matchAll(/['"`](player|enemy)['"`]/g)].map((m) => m[0])
  assert(hits.length === 0,
    `(a) engine/rules.js 出现了侧别字面量 ${hits.join(', ')} —— 规则的守门人不得知道任何一侧的名字。` +
    `\n      需要「哪一侧」时用参数 side / sides.js 的 opp(side)。侧别字面量只允许活在 React 外壳（useBattle）里。`)

  // 同时守住既有的 side-blind 模块（它们今天就是零 —— 别让谁开第一枪）
  for (const f of [
    'src/engine/combat.js', 'src/engine/aiTarget.js', 'src/engine/statusEffects.js',
    'src/utils/damage.js', 'src/utils/guardSkill.js', 'src/utils/factionMarkers.js',
    // wire.js 入列（PvP 第 1 步）：**一个不能命名某一侧的模块，在结构上就无法偏袒某一侧** ——
    // 对 wire 这条尤其要紧，因为它是「座位」这个概念**唯一**的入口。它一旦能写出 'player'，
    // 「host 恒为 player」就会从**连接的属性**悄悄变成**协议的属性**，而那正是 guest 伪造座位
    // 的第一块砖。
    'src/engine/wire.js',
  ]) {
    const h = [...stripComments(read(f)).matchAll(/['"`](player|enemy)['"`]/g)].map((m) => m[0])
    assert(h.length === 0, `(a) ${f} 本来是 side-blind 的，现在出现了 ${h.join(', ')}`)
  }
}

// ---- (b) ai* 三兄弟不得复活 ----
// aiPlayToField(S4) / aiAttack(S5) / aiPlayEventCard(S6) 都已删。它们的共同特征是
// 「另一条不守规则的路」：aiAttack 一行守护检查都没有、aiPlayToField 一道 gate 都没有。
{
  const hooks = ['src/hooks/useBattle.js', 'src/hooks/useAITurn.js']
  for (const f of hooks) {
    const code = stripComments(read(f))
    const decls = [...code.matchAll(/const\s+(ai[A-Z]\w*)\s*=\s*useCallback/g)].map((m) => m[1])
    assert(decls.length === 0,
      `(b) ${f} 又出现了 ai* 引擎入口：${decls.join(', ')} —— 那是 fork 复活。` +
      `\n      AI 与玩家必须走同一条 side 参数化的路；AI 的**人格**（怎么选）归 engine/aiTarget.js。`)
  }
  // 导出表里也不许有
  const ub = stripComments(read('src/hooks/useBattle.js'))
  const exported = [...ub.matchAll(/\b(aiPlayToField|aiAttack|aiPlayEventCard)\b/g)].map((m) => m[1])
  assert(exported.length === 0, `(b) useBattle 仍引用已退役的 ${[...new Set(exported)].join(', ')}`)
}

// ---- (c) rules.js 的每个导出都必须收 side ----
// 一个不收 side 的规则谓词，要么在偷偷假设某一侧，要么根本不是规则。
{
  const code = stripComments(read('src/engine/rules.js'))
  const fns = [...code.matchAll(/export function (\w+)\s*\(([^)]*)\)/g)].map((m) => ({ name: m[1], params: m[2] }))
  assert(fns.length >= 3, `(c) rules.js 至少应导出 3 个谓词，实得 ${fns.length}`)
  for (const { name, params } of fns) {
    assert(/\bside\b/.test(params),
      `(c) rules.${name}(${params}) 没有 side 参数 —— 规则谓词必须由调用方指明「站在谁的角度」`)
  }
}

// ---- (d) 统一入口必须真的带 side 参数（正向断言）----
// 光有「没有 ai*」还不够 —— 得确认合并后的入口真的是 side 参数化的。
{
  const ub = stripComments(read('src/hooks/useBattle.js'))
  for (const [fn, sig] of [
    ['playToField', /const playToField = useCallback\(\(card, slotIdx, side = 'player'\)/],
    ['attack', /const attack = useCallback\(\(atkSlot, defSlot, awakenOpts = \{\}, side = 'player'\)/],
    ['playEventCard', /const playEventCard = useCallback\(\(card, opts = \{\}, side = 'player'\)/],
    ['endMainPhase', /const endMainPhase = useCallback\(\(side = 'player'\)/],
  ]) {
    assert(sig.test(ub), `(d) ${fn} 的签名不再是 side 参数化的 —— de-fork 被回退了？`)
  }
}

// ---- 汇总 ----
if (fails.length) {
  console.error(`❌ test-no-side-fork: ${fails.length} 条失败`)
  for (const f of fails) console.error('   · ' + f)
  process.exit(1)
}
console.log(`✅ test-no-side-fork: ${pass} 条断言通过`)
