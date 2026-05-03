#!/usr/bin/env node
// Sprint 32 Step 1: ch2 题库审计
// 输出 outputs/ch2_quiz_audit.md

import cards from '../src/data/cards.js'
import { quizzes } from '../src/data/quizzes.js'
import fs from 'node:fs'
import path from 'node:path'

// ch2 spec 列出的敌方 pathogen 卡 (10 张, 按关卡)
const CH2_PATHOGENS = [
  { stage: 'ch2-1 蛀牙军团', ids: ['cavity_bacteria'] },
  { stage: 'ch2-2 食物中毒', ids: ['salmonella', 'ecoli_thug'] },
  { stage: 'ch2-3 流感风暴', ids: ['flu_virus'] },
  { stage: 'ch2-4 蚊媒双煞', ids: ['dengue_fever', 'plasmodium_parasite'] },
  { stage: 'ch2-5 狂犬危机', ids: ['rabies_virus'] },
  { stage: 'ch2-6 疫苗两难', ids: ['smallpox_ghost'] },
  { stage: 'ch2-7 抗生素滥用', ids: ['mrsa_invincible'] },
  { stage: 'ch2-8 BOSS', ids: ['covid_overlord'] },
]

const ch2PathogenIds = new Set(CH2_PATHOGENS.flatMap(s => s.ids))

// 玩家阵营: body + tech 全部
const bodyCards = cards.filter(c => c.faction === 'body' && c.type !== 'event')
const techCards = cards.filter(c => c.faction === 'tech' && c.type !== 'event')
const eventBodyCards = cards.filter(c => c.faction === 'body' && c.type === 'event')
const eventTechCards = cards.filter(c => c.faction === 'tech' && c.type === 'event')

const ch2PathogenCards = [...ch2PathogenIds].map(id => {
  const c = cards.find(x => x.id === id)
  if (!c) return { id, missing: true }
  return c
})

// 检查 spec 列出的卡是否都存在
const missingPathogens = ch2PathogenCards.filter(c => c.missing)

// 题目按 cardId 分组
const quizzesByCard = {}
for (const q of quizzes) {
  if (!q.cardId) continue
  ;(quizzesByCard[q.cardId] ||= []).push(q)
}

function classifyQuiz(q) {
  // 题目暂时还没有 type 字段, 用 difficulty 猜
  if (q.type) return q.type
  if (q.difficulty === 'easy') return 'memorization?'
  if (q.difficulty === 'medium') return 'mechanism?'
  if (q.difficulty === 'hard') return 'inference?'
  return 'unknown'
}

function auditCard(card) {
  const list = quizzesByCard[card.id] || []
  const types = list.map(classifyQuiz)
  const counts = {
    memorization: types.filter(t => t.startsWith('memorization')).length,
    mechanism: types.filter(t => t.startsWith('mechanism')).length,
    inference: types.filter(t => t.startsWith('inference')).length,
  }
  // 缺哪一层 (按 spec 目标 1+/1+/1+)
  const missing = []
  if (counts.memorization < 1) missing.push('🟢basic')
  if (counts.mechanism < 1) missing.push('🟡mech')
  if (counts.inference < 1) missing.push('🔴infer')

  let status
  if (list.length === 0) status = '⛔ 完全无题'
  else if (missing.length === 0) status = '✅ 三层齐全'
  else if (missing.length === 1) status = '🟡 缺 ' + missing.join('+')
  else status = '🔴 缺 ' + missing.join('+')

  return { card, list, counts, missing, status }
}

function tableRow(audit) {
  const c = audit.card
  return `| \`${c.id}\` | ${c.name} | ${c.rarity || '-'} | ${audit.list.length} | ${audit.counts.memorization} / ${audit.counts.mechanism} / ${audit.counts.inference} | ${audit.status} |`
}

const lines = []
const push = (s = '') => lines.push(s)

push('# Sprint 32 Step 1: ch2 题库审计报告')
push('')
push(`> 生成时间: ${new Date().toISOString()}`)
push(`> 数据源: src/data/cards.js · src/data/quizzes.js`)
push(`> 题库总数: **${quizzes.length}** 题`)
push('')
push('## 题型分类说明')
push('')
push('当前题库**还没有 `type` 字段**,本审计用 `difficulty` 推测层级 (后缀加 `?`):')
push('')
push('| difficulty | 推测 type | 含义 |')
push('|---|---|---|')
push('| easy | memorization? | 是什么/做什么 |')
push('| medium | mechanism? | 怎么工作/为什么 |')
push('| hard | inference? | 应用/迁移 |')
push('')
push('⚠️ **重要**: 这种推测会高估机制题/推理题数量,因为旧题里很多 medium/hard 其实是"细节趣事题"(纯记忆,只是细节冷门),不是机制/推理题。Step 5 review 时需要重新分类。')
push('')

// =========== 病原 ============
push('---')
push('')
push('## 1. 敌方 pathogen 卡 (ch2 关卡 boss 顺序)')
push('')
push('| cardId | 名称 | 稀有度 | 总题数 | M / Mech / Inf | 状态 |')
push('|---|---|---|---|---|---|')
for (const stage of CH2_PATHOGENS) {
  push(`| **${stage.stage}** | | | | | |`)
  for (const id of stage.ids) {
    const c = cards.find(x => x.id === id)
    if (!c) {
      push(`| \`${id}\` | ❌ 不存在于 cards.js | - | - | - | ⛔ MISSING |`)
      continue
    }
    push(tableRow(auditCard(c)))
  }
}

if (missingPathogens.length > 0) {
  push('')
  push(`⚠️ **spec 提到但 cards.js 找不到**: ${missingPathogens.map(c => '`' + c.id + '`').join(', ')}`)
}

// =========== body ============
push('')
push('---')
push('')
push(`## 2. 玩家 body 阵营 (人体系) — ${bodyCards.length} 张 character`)
push('')
push('| cardId | 名称 | 稀有度 | 总题数 | M / Mech / Inf | 状态 |')
push('|---|---|---|---|---|---|')
const bodyAudits = bodyCards.map(auditCard)
for (const a of bodyAudits) push(tableRow(a))

if (eventBodyCards.length > 0) {
  push('')
  push(`#### body 事件卡 — ${eventBodyCards.length} 张`)
  push('')
  push('| cardId | 名称 | 总题数 | 状态 |')
  push('|---|---|---|---|')
  for (const c of eventBodyCards) {
    const a = auditCard(c)
    push(`| \`${c.id}\` | ${c.name} | ${a.list.length} | ${a.status} |`)
  }
}

// =========== tech ============
push('')
push('---')
push('')
push(`## 3. 玩家 tech 阵营 (科技系) — ${techCards.length} 张 character`)
push('')
push('| cardId | 名称 | 稀有度 | 总题数 | M / Mech / Inf | 状态 |')
push('|---|---|---|---|---|---|')
const techAudits = techCards.map(auditCard)
for (const a of techAudits) push(tableRow(a))

if (eventTechCards.length > 0) {
  push('')
  push(`#### tech 事件卡 — ${eventTechCards.length} 张`)
  push('')
  push('| cardId | 名称 | 总题数 | 状态 |')
  push('|---|---|---|---|')
  for (const c of eventTechCards) {
    const a = auditCard(c)
    push(`| \`${c.id}\` | ${c.name} | ${a.list.length} | ${a.status} |`)
  }
}

// =========== 汇总 ============
const allCh2Cards = [
  ...ch2PathogenCards.filter(c => !c.missing),
  ...bodyCards,
  ...techCards,
]
const allAudits = allCh2Cards.map(auditCard)

const totalCards = allAudits.length
const fullCovered = allAudits.filter(a => a.missing.length === 0).length
const noQuiz = allAudits.filter(a => a.list.length === 0).length
const partialQuiz = allAudits.filter(a => a.list.length > 0 && a.missing.length > 0).length

const ch2QuizCount = allAudits.reduce((s, a) => s + a.list.length, 0)
const totalEasy = allAudits.reduce((s, a) => s + a.counts.memorization, 0)
const totalMed = allAudits.reduce((s, a) => s + a.counts.mechanism, 0)
const totalHard = allAudits.reduce((s, a) => s + a.counts.inference, 0)

push('')
push('---')
push('')
push('## 4. 汇总数字')
push('')
push(`### 卡牌覆盖`)
push(`- ch2 涉及卡总数(character): **${totalCards}** (病原 ${ch2PathogenCards.filter(c => !c.missing).length} + body ${bodyCards.length} + tech ${techCards.length})`)
push(`- 三层齐全 ✅: **${fullCovered}** (${(fullCovered/totalCards*100).toFixed(0)}%)`)
push(`- 部分覆盖 🟡: **${partialQuiz}**`)
push(`- 完全无题 ⛔: **${noQuiz}**`)
push('')
push(`### ch2 现有题数`)
push(`- 这些卡当前有题: **${ch2QuizCount}** 题 (占题库 ${quizzes.length} 题中的 ${(ch2QuizCount/quizzes.length*100).toFixed(0)}%)`)
push(`- 推测分布: easy/memorization? **${totalEasy}** · medium/mechanism? **${totalMed}** · hard/inference? **${totalHard}**`)
push('')

// =========== 缺口 ============
push('## 5. 需要补的题 (按"每张卡至少 1 道基础+1 道机制+1 道推理")')
push('')
const need = { mem: 0, mech: 0, inf: 0 }
const noQuizCards = []
const partialCards = []
for (const a of allAudits) {
  if (a.counts.memorization < 1) need.mem++
  if (a.counts.mechanism < 1) need.mech++
  if (a.counts.inference < 1) need.inf++
  if (a.list.length === 0) noQuizCards.push(a.card)
  else if (a.missing.length > 0) partialCards.push(a)
}
push(`- 🟢 需要补**基础题**: ${need.mem} 张卡`)
push(`- 🟡 需要补**机制题**: ${need.mech} 张卡`)
push(`- 🔴 需要补**推理题**: ${need.inf} 张卡`)
push('')
push(`**最低补题工作量**: ${need.mem + need.mech + need.inf} 道 (按 spec 估算: ~150)`)
push('')

push('### 5.1 完全无题的卡 (优先 — 每张需写满 3 道)')
push('')
if (noQuizCards.length === 0) push('_无_')
else {
  push('| cardId | 名称 | 阵营 | scienceCard 摘要 |')
  push('|---|---|---|---|')
  for (const c of noQuizCards) {
    const sci = (c.scienceCard || '').replace(/\n/g, ' ').slice(0, 80)
    push(`| \`${c.id}\` | ${c.name} | ${c.faction} | ${sci}${(c.scienceCard||'').length > 80 ? '…' : ''} |`)
  }
}

push('')
push('### 5.2 部分覆盖的卡 (要补的层)')
push('')
if (partialCards.length === 0) push('_无_')
else {
  push('| cardId | 名称 | 已有题数 | 缺 |')
  push('|---|---|---|---|')
  for (const a of partialCards) {
    push(`| \`${a.card.id}\` | ${a.card.name} | ${a.list.length} | ${a.missing.join(' + ')} |`)
  }
}

// =========== 已有题样本 ============
push('')
push('---')
push('')
push('## 6. ch2 已有题目分布快照 (供 review 是否真是机制/推理)')
push('')
push('随机抽 10 道现有 ch2 题让你校准"难度推测是否合理":')
push('')
const ch2QuizPool = []
for (const a of allAudits) ch2QuizPool.push(...a.list.map(q => ({ q, card: a.card })))
const sample = ch2QuizPool
  .sort(() => Math.random() - 0.5)
  .slice(0, 10)
for (const { q, card } of sample) {
  const guess = classifyQuiz(q)
  push(`- [\`${card.id}\` · ${q.difficulty} · 推测 **${guess}**] ${q.q}`)
  push(`  - 答案: ${q.options[q.answer]}`)
  push(`  - fact: ${q.fact.slice(0, 100)}${q.fact.length > 100 ? '…' : ''}`)
}

// =========== Yang 决策点 ============
push('')
push('---')
push('')
push('## 7. Yang 需要决策的点 (审计阶段)')
push('')
push('1. **病原卡列表对吗?** spec 列了 10 张 (ch2-1 到 ch2-8),漏掉的有没有? 比如其他章节里也用到的病原?')
push('2. **body 阵营是否全收?** spec 写"~19 张"但实际 body 有 ' + bodyCards.length + ' 张 character。')
push('   - 全收(连 ch3/ch4 才用到的卡也补)还是先挑 ch2 实际出场的子集?')
push('3. **tech 阵营同上**: 实际 ' + techCards.length + ' 张。')
push('4. **事件卡要不要出题?** body/tech 里有事件卡 (' + (eventBodyCards.length + eventTechCards.length) + ' 张),不在 spec 范围,默认跳过。')
push('5. **难度推测靠谱吗?** 看完第 6 节样本,如果 medium/hard 题大多是"细节趣事"而非机制/推理,Step 4 的机制题缺口实际比表格更大。')
push('6. **现有题目要不要 type 标注?** spec Step 7 提了 (旧题加 type),但需要在审计阶段就明确"现有题里有多少能直接当机制/推理用,有多少要重写"。')
push('')

// 写文件
const outPath = path.resolve('outputs/ch2_quiz_audit.md')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8')
console.log('✅ 写入', outPath)
console.log(`卡牌: ${totalCards} | 全覆盖 ${fullCovered} | 无题 ${noQuiz} | 部分 ${partialQuiz}`)
console.log(`需补: 基础 ${need.mem} · 机制 ${need.mech} · 推理 ${need.inf} = ${need.mem+need.mech+need.inf} 道`)
