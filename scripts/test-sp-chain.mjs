#!/usr/bin/env node
// SP 链路回归测试（齐齐实测「SP 根本打不出来」修复后新增 — 此前零覆盖）
//
// 复刻 useBattle.js 的 getEligibleSpCards 资格判定（纯数据 + 纯函数，不 import hook/组件），
// 用真实的 spCards / eventCards + 从 testDecks.js 文本抽出的玩家·敌方预设卡组，验证：
//   1. 触发路径存在：玩家/敌方预设里有「带 spSummonRule 的事件卡」且能对上 SP 卡组里的卡
//   2. 解封：turn≥3 时这些事件卡能召出 SP（修复前 spCost<=turn 把它们推到 turn5-10 → 永远出不来）
//   3. 不过早：turn1/2 一律锁死（回到齐齐原始抱怨「AI 第 1-2 回合甩 SP」）
//
// 注：不 import testDecks.js（它 `import from './cards'` 缺 .js 扩展，Node ESM 跑不了），
//     改 readFileSync 抽 ID —— 沿用本仓库「grep 源码接线」惯例。
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import eventCardsRaw from '../src/data/eventCards.js'
import spCardsRaw from '../src/data/spCards.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const eventCards = eventCardsRaw.default || eventCardsRaw
const spCards = spCardsRaw.default || spCardsRaw
let pass = 0, fail = 0
const ok = (n, c) => { if (c) pass++; else { fail++; console.error(`❌ ${n}`) } }

// ---- 从 testDecks.js 文本抽出各预设卡组的卡 ID ----
const decksSrc = readFileSync(join(ROOT, 'src/data/testDecks.js'), 'utf8')
function arrayBlock(name) {
  const s = decksSrc.indexOf(`export const ${name}`)
  const open = decksSrc.indexOf('[', s)
  return decksSrc.slice(open, decksSrc.indexOf(']', open))
}
const idsIn = (block, fn) => [...block.matchAll(new RegExp(`${fn}\\(['"]([^'"]+)['"]\\)`, 'g'))].map(m => m[1])
const evById = id => eventCards.find(c => c.id === id)
const spById = id => spCards.find(c => c.id === id)

// ---- 复刻 getEligibleSpCards 的资格判定（与 useBattle.js 保持一致）----
// hasEmpty 与 discardMarkers 在真机由战场/弃牌堆决定；测试给「充足条件」以隔离回合门槛逻辑。
function gate(rule, spDeck, turn, { remainingEnergy = 99, markers = {}, hasEmpty = true } = {}) {
  if (!hasEmpty) return []
  if (!rule || spDeck.length === 0) return []
  if (turn < 3) return []                       // ← 本次修复：只挡第 1-2 回合
  let candidates = []
  switch (rule.type) {
    case 'cost_limit':
      candidates = spDeck.filter(sp => sp.spCost <= rule.maxCost); break
    case 'spend_all_energy':
      candidates = spDeck.filter(sp => sp.spCost <= remainingEnergy); break
    case 'faction_only':
      candidates = spDeck.filter(sp => sp.faction === rule.factionLimit && sp.spCost <= (rule.maxCost || 99)); break
    case 'discard_check':
      if ((markers[rule.discardFaction] || 0) >= (rule.discardCount || 0))
        candidates = spDeck.filter(sp => sp.spCost <= (rule.maxCost || 99))
      break
    default: break
  }
  return candidates                              // ← 本次修复：不再 .filter(sp.spCost<=turn)
}

// discard_check 给足标记，让该规则在「资格」层面可评估（真机靠弃牌堆累计）
const ample = { remainingEnergy: 99, markers: { nature: 9, body: 9, pathogen: 9, tech: 9 } }

for (const [who, deckName, spName] of [
  ['玩家', 'playerTestDeck', 'playerTestSpDeck'],
  ['敌方', 'enemyTestDeck', 'enemyTestSpDeck'],
]) {
  const spDeck = idsIn(arrayBlock(spName), 'spById').map(spById)
  const evts = idsIn(arrayBlock(deckName), 'byId')
    .filter(id => id.startsWith('event_')).map(evById)
    .filter(e => e && e.spSummonRule)

  ok(`${who}: SP 卡组解析非空且卡都存在`, spDeck.length > 0 && spDeck.every(Boolean))
  ok(`${who}: 预设卡组含带 spSummonRule 的触发事件卡`, evts.length > 0)

  // 1/2 回合：所有触发事件卡都召不出 SP（杜绝过早）
  for (const turn of [1, 2]) {
    const anySummonable = evts.some(e => gate(e.spSummonRule, spDeck, turn, ample).length > 0)
    ok(`${who}: 第 ${turn} 回合任何触发卡都召不出 SP（不过早）`, !anySummonable)
  }

  // 第 3 回合：至少一张触发事件卡能召出 SP（解封 + 触发路径真实可达）
  const summonableAt3 = evts
    .map(e => ({ e, cands: gate(e.spSummonRule, spDeck, 3, ample) }))
    .filter(x => x.cands.length > 0)
  ok(`${who}: 第 3 回合存在可召出 SP 的触发事件卡（已解封）`, summonableAt3.length > 0)
  console.log(`\n  ${who} 第 3 回合可召唤路径：`)
  for (const { e, cands } of summonableAt3)
    console.log(`    📜 ${e.name}（${e.spSummonRule.type}）→ ${cands.map(c => `${c.name}[cost${c.spCost}]`).join('、')}`)
}

// 兜底：全体 SP 的 spCost 都 ≥ 3（否则 turn<3 门槛会误伤——当前最小 5，安全）
ok('所有 SP 的 spCost ≥ 3（回合门槛不会误伤合法 SP）', spCards.every(sp => sp.spCost >= 3))

console.log(`\n${fail === 0 ? '✅' : '⚠️'} 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
