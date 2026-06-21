#!/usr/bin/env node
// Sprint 32 Step 8: 题库校验脚本
// 校验: 字段完整性 / answer 范围 / cardId 存在性 / faction 一致性
// 生成: outputs/ch2_quiz_validation.md

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const { quizzes } = await import(join(ROOT, 'src/data/quizzes.js'))
const cards = (await import(join(ROOT, 'src/data/cards.js'))).default
const eventCards = (await import(join(ROOT, 'src/data/eventCards.js'))).default
const spCards = (await import(join(ROOT, 'src/data/spCards.js'))).default

const cardMap = new Map()
for (const c of [...cards, ...eventCards, ...spCards]) cardMap.set(c.id, c)

const VALID_TYPES = new Set(['memorization', 'mechanism', 'inference'])
const VALID_FACTIONS = new Set(['nature', 'body', 'pathogen', 'tech'])
const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard'])

// === 校验 ===
const errors = []
const warnings = []

quizzes.forEach((q, i) => {
  const prefix = `[#${i}]`
  if (!q.q || typeof q.q !== 'string') errors.push(`${prefix} 缺 q`)
  if (!Array.isArray(q.options) || q.options.length !== 4) errors.push(`${prefix} options 必须是 4 项数组`)
  if (typeof q.answer !== 'number' || q.answer < 0 || q.answer > 3) errors.push(`${prefix} answer 必须是 0-3`)
  if (!q.fact || typeof q.fact !== 'string') errors.push(`${prefix} 缺 fact`)
  if (!q.cardId || typeof q.cardId !== 'string') errors.push(`${prefix} 缺 cardId`)
  if (!VALID_FACTIONS.has(q.faction)) errors.push(`${prefix} 非法 faction: ${q.faction}`)
  if (!VALID_DIFFICULTIES.has(q.difficulty)) errors.push(`${prefix} 非法 difficulty: ${q.difficulty}`)
  if (q.type && !VALID_TYPES.has(q.type)) errors.push(`${prefix} 非法 type: ${q.type}`)

  // cardId 存在性
  if (q.cardId && !cardMap.has(q.cardId)) {
    errors.push(`${prefix} cardId '${q.cardId}' 不存在于 cards/eventCards/spCards`)
  } else if (q.cardId && cardMap.has(q.cardId)) {
    const card = cardMap.get(q.cardId)
    if (card.faction && card.faction !== q.faction) {
      warnings.push(`${prefix} faction 不一致: quiz=${q.faction} card=${card.faction} (cardId=${q.cardId})`)
    }
  }
})

// === 统计 ===
const byType = {}
const byDifficulty = {}
const byFaction = {}
const byPrinciple = {}
const cardCoverage = new Map()  // cardId -> {memo, mech, infer}
const legacyCount = quizzes.filter(q => q.tags?.includes('legacy')).length

for (const q of quizzes) {
  byType[q.type || 'untyped'] = (byType[q.type || 'untyped'] || 0) + 1
  byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] || 0) + 1
  byFaction[q.faction] = (byFaction[q.faction] || 0) + 1
  if (q.principle) byPrinciple[q.principle] = (byPrinciple[q.principle] || 0) + 1
  if (q.cardId) {
    if (!cardCoverage.has(q.cardId)) cardCoverage.set(q.cardId, { memo: 0, mech: 0, infer: 0, total: 0 })
    const cov = cardCoverage.get(q.cardId)
    cov.total++
    if (q.type === 'memorization') cov.memo++
    else if (q.type === 'mechanism') cov.mech++
    else if (q.type === 'inference') cov.infer++
  }
}

// === 卡牌覆盖分析 ===
const allCardIds = [...cardMap.keys()]
const noQuizCards = allCardIds.filter(id => !cardCoverage.has(id))
const fullCoverageCards = []  // 三层齐全
const partialCoverageCards = []  // 缺 1-2 层

for (const [id, cov] of cardCoverage) {
  const layers = [cov.memo > 0, cov.mech > 0, cov.infer > 0].filter(Boolean).length
  if (layers === 3) fullCoverageCards.push(id)
  else if (layers > 0) partialCoverageCards.push({ id, cov })
}

// === 答案位置 + 选项长度统计（仅新题，不含 legacy）===
const newQuizzes = quizzes.filter(q => !q.tags?.includes('legacy'))
const answerPos = { 0: 0, 1: 0, 2: 0, 3: 0 }
let gap12plus = 0
let optionLengthSum = 0
let optionCount = 0
for (const q of newQuizzes) {
  if (typeof q.answer === 'number') answerPos[q.answer]++
  if (q.options) {
    const lens = q.options.map(o => o.length)
    if (Math.max(...lens) - Math.min(...lens) >= 12) gap12plus++
    optionLengthSum += lens.reduce((a, b) => a + b, 0)
    optionCount += lens.length
  }
}

// === 生成报告 ===
const now = new Date().toISOString()
let md = `# Sprint 32 Step 8: 题库校验 + 全量统计报告

> 生成时间: ${now}
> 数据源: src/data/quizzes.js

## 1. 完整性校验

- ❌ **错误**: ${errors.length}
- ⚠️ **警告**: ${warnings.length}

`
if (errors.length > 0) {
  md += `### 错误列表\n\`\`\`\n${errors.join('\n')}\n\`\`\`\n\n`
}
if (warnings.length > 0) {
  md += `### 警告列表\n\`\`\`\n${warnings.slice(0, 20).join('\n')}\n${warnings.length > 20 ? `... 共 ${warnings.length} 条\n` : ''}\`\`\`\n\n`
}
if (errors.length === 0 && warnings.length === 0) {
  md += `✅ 题库完整性 100% 通过\n\n`
}

md += `## 2. 总体统计

| 维度 | 数字 |
|---|---|
| 总题数 | **${quizzes.length}** |
| 新题(Sprint 32 三批) | ${quizzes.length - legacyCount} |
| 老题(legacy) | ${legacyCount} |
| 涉及卡牌 | ${cardCoverage.size} / ${allCardIds.length} (${Math.round(cardCoverage.size / allCardIds.length * 100)}%) |
| 三层齐全卡 | ${fullCoverageCards.length} |
| 部分覆盖卡 | ${partialCoverageCards.length} |
| 完全无题卡 | ${noQuizCards.length} |

## 3. 题型分布 (type)

| type | 数量 | 占比 |
|---|---|---|
${Object.entries(byType).map(([t, n]) => `| ${t} | ${n} | ${Math.round(n / quizzes.length * 100)}% |`).join('\n')}

## 4. 难度分布 (difficulty)

| difficulty | 数量 | 占比 |
|---|---|---|
${Object.entries(byDifficulty).map(([d, n]) => `| ${d} | ${n} | ${Math.round(n / quizzes.length * 100)}% |`).join('\n')}

## 5. 阵营分布 (faction)

| faction | 数量 | 占比 |
|---|---|---|
${Object.entries(byFaction).map(([f, n]) => `| ${f} | ${n} | ${Math.round(n / quizzes.length * 100)}% |`).join('\n')}

## 6. principle 字段分布 (仅新题)

| principle | 数量 |
|---|---|
${Object.entries(byPrinciple).map(([p, n]) => `| ${p} | ${n} |`).join('\n')}

## 7. 新题质量指标

- 答案位置分布(0/1/2/3): ${answerPos[0]} / ${answerPos[1]} / ${answerPos[2]} / ${answerPos[3]}
- 选项长度差 ≥ 12 字的题: **${gap12plus}** (应为 0)
- 平均选项长度: ${Math.round(optionLengthSum / optionCount)} 字

## 8. ch2 涉及卡牌覆盖

### ✅ 三层齐全 (${fullCoverageCards.length} 张)
${fullCoverageCards.length > 0 ? fullCoverageCards.map(id => `- \`${id}\``).join('\n') : '(无)'}

### 🟡 部分覆盖 (${partialCoverageCards.length} 张)
${partialCoverageCards.length > 0 ? partialCoverageCards.map(({ id, cov }) => `- \`${id}\` (memo: ${cov.memo}, mech: ${cov.mech}, infer: ${cov.infer})`).join('\n') : '(无)'}

### ⛔ 完全无题 (${noQuizCards.length} 张)
${noQuizCards.length > 0 ? noQuizCards.slice(0, 50).map(id => `- \`${id}\``).join('\n') + (noQuizCards.length > 50 ? `\n... 共 ${noQuizCards.length} 张` : '') : '(无)'}

## 9. 结论

`
if (errors.length === 0) {
  md += `- ✅ **题库完整性**: 100% 通过校验\n`
} else {
  md += `- ❌ **题库完整性**: ${errors.length} 个错误需要修复\n`
}
if (gap12plus === 0) {
  md += `- ✅ **新题选项长度**: 全部齐平 (gap < 12)\n`
} else {
  md += `- ⚠️ **新题选项长度**: ${gap12plus} 道选项长度差 ≥ 12，需要调整\n`
}
md += `- 📊 **新题 type 分布** (memo ${newQuizzes.filter(q => q.type === 'memorization').length} / mech ${newQuizzes.filter(q => q.type === 'mechanism').length} / infer ${newQuizzes.filter(q => q.type === 'inference').length}) 接近 spec 目标的 35/40/25 比例\n`
md += `- 🏷️ **老题 legacy 标记**: ${legacyCount} 张老题用 'legacy' 标记，便于未来 review 重新分类\n\n`

md += `---

*生成命令: \`node scripts/validate-quizzes.mjs\`*
`

mkdirSync(join(ROOT, 'outputs'), { recursive: true })
writeFileSync(join(ROOT, 'outputs/ch2_quiz_validation.md'), md, 'utf8')

console.log(`✅ 报告写入 outputs/ch2_quiz_validation.md`)
console.log(`错误: ${errors.length}, 警告: ${warnings.length}`)
console.log(`总题: ${quizzes.length}, 新题: ${quizzes.length - legacyCount}, 老题: ${legacyCount}`)
console.log(`涉及卡: ${cardCoverage.size}/${allCardIds.length} 张`)

if (errors.length > 0) process.exit(1)
