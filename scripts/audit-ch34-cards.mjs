#!/usr/bin/env node
// Sprint X+1 Step 1: ch3/ch4 卡牌审计
// 找出 63 张完全无题的卡，按章节/主题分组
//
// 用法: node scripts/audit-ch34-cards.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const { quizzes } = await import(join(ROOT, 'src/data/quizzes.js'))
const cards = (await import(join(ROOT, 'src/data/cards.js'))).default
const eventCards = (await import(join(ROOT, 'src/data/eventCards.js'))).default
const spCards = (await import(join(ROOT, 'src/data/spCards.js'))).default
const { campaignData } = await import(join(ROOT, 'src/data/campaignData.js'))

const allCards = [...cards, ...eventCards, ...spCards]
const cardMap = new Map(allCards.map(c => [c.id, c]))

// 找出每张卡在哪些章节出现（通过敌方 deck/spDeck + bossPreplaced + factionRequirement 推断玩家方）
const cardChapters = new Map() // cardId -> Set<chapterId>
const cardRoles = new Map()    // cardId -> Set<'enemy_deck' | 'boss_preplaced' | 'enemy_sp' | 'player_recommended'>

for (const ch of campaignData.chapters || []) {
  for (const stage of ch.stages || []) {
    const cfg = stage.enemyConfig || {}
    const ids = [
      ...(cfg.deck || []),
      ...(cfg.spDeck || []),
      cfg.bossPreplaced,
    ].filter(Boolean)
    for (const id of ids) {
      if (!cardChapters.has(id)) cardChapters.set(id, new Set())
      cardChapters.get(id).add(ch.id)
    }
  }
}

// 已覆盖的 cardId
const coveredCardIds = new Set()
for (const q of quizzes) {
  if (q.cardId) coveredCardIds.add(q.cardId)
}

// 完全无题的 cardId
const uncovered = allCards.filter(c => !coveredCardIds.has(c.id))

// 按 faction + chapter 分组
const groups = {}
for (const card of uncovered) {
  const chs = cardChapters.get(card.id) || new Set()
  const chList = [...chs].sort()
  const chKey = chList.length ? chList.join(',') : 'unused'
  const faction = card.faction || 'unknown'
  const key = `${chKey}_${faction}`
  if (!groups[key]) groups[key] = []
  groups[key].push(card)
}

// === 报告 ===
const now = new Date().toISOString()
let md = `# ch3/ch4 题库扩充 Step 1: 完全无题卡牌审计

> 生成时间: ${now}
> 数据源: src/data/quizzes.js · src/data/cards.js · src/data/campaignData.js

## 1. 总体统计

| 维度 | 数字 |
|---|---|
| 卡牌总数 | ${allCards.length} |
| 已有题的卡 | ${coveredCardIds.size} |
| **完全无题** | **${uncovered.length}** |

## 2. 完全无题卡按章节 + 阵营分组

`

const sortedKeys = Object.keys(groups).sort()
for (const key of sortedKeys) {
  const cards = groups[key]
  const [chPart, faction] = key.split('_')
  const chLabel = chPart === 'unused' ? '⚠️ 未出现在任何关卡' : `章节 ${chPart}`
  md += `### ${chLabel} · ${faction} (${cards.length} 张)\n\n`
  md += `| cardId | 名称 | 稀有度 | type | subType | scienceCard 摘要 |\n`
  md += `|---|---|---|---|---|---|\n`
  for (const c of cards) {
    const sc = (c.scienceCard || '').slice(0, 80).replace(/[\n|]/g, ' ')
    md += `| \`${c.id}\` | ${c.name || '?'} | ${c.rarity || '-'} | ${c.type || '-'} | ${c.subType || '-'} | ${sc}${sc.length >= 80 ? '...' : ''} |\n`
  }
  md += '\n'
}

md += `## 3. 工作量预估

按 Sprint 32 框架（每张卡 1 基础 + 1 机制 + 1 推理）：
- 总题数 = ${uncovered.length} × 3 = **${uncovered.length * 3}** 道
- 但实际可能有些卡 1-2 题就够（subType 相似的卡复用机制）

## 4. 实施建议

1. **优先 ch3 ch4 真实出现的卡**（在 campaign 里被用到）
2. **延后 'unused' 卡**（如果有）：可能是历史遗留卡，等需要时再补
3. **按主题批量出题**：海洋生态/食物链/科技伦理/AI/基因编辑 等主题相关卡一起出
4. **沿用 Sprint 32 质量标准**：选项长度齐平、错误选项是常见误解、principle 字段标注

---

*生成命令: \`node scripts/audit-ch34-cards.mjs\`*
`

mkdirSync(join(ROOT, 'outputs'), { recursive: true })
writeFileSync(join(ROOT, 'outputs/ch34_audit.md'), md, 'utf8')
console.log(`✅ 报告写入 outputs/ch34_audit.md`)
console.log(`完全无题: ${uncovered.length} 张`)
console.log(`按 章节+阵营 分 ${Object.keys(groups).length} 组`)
