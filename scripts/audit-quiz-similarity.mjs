#!/usr/bin/env node
// 题库相似度审核（信息性脚本，非门禁）——扫全部题，找「题干太像」或「知识点(fact)太像」的对，
//   供扩题前审现状 + 扩题时防撞。相似度 = 中文字符 bigram 的 Jaccard（题干 qSim / 知识点 factSim）。
//   用法: node scripts/audit-quiz-similarity.mjs [阈值]   默认 0.55
import { quizzes } from '../src/data/quizzes.js'

const THRESHOLD = parseFloat(process.argv[2]) || 0.55

// 归一化：只留中文/字母/数字，去标点空格 → 字符序列
const norm = (s) => (s || '').toLowerCase().replace(/[^一-龥a-z0-9]/g, '')
// 字符 bigram 集合（单字时退化为该字）
function bigrams(s) {
  const t = norm(s)
  if (t.length <= 1) return new Set(t ? [t] : [])
  const g = new Set()
  for (let i = 0; i < t.length - 1; i++) g.add(t.slice(i, i + 2))
  return g
}
function jaccard(a, b) {
  if (!a.size || !b.size) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter / (a.size + b.size - inter)
}

// 预计算每题的 bigram（题干 + 知识点）
const items = quizzes.map((q, i) => ({
  i, q: q.q, fact: q.fact || '', cardId: q.cardId || (q.scope === 'general' ? '(通用)' : '(无)'),
  type: q.type || '?', qg: bigrams(q.q), fg: bigrams(q.fact || ''),
  qn: norm(q.q),
}))

// ① 精确重复（归一化题干完全相同）——这是真 bug
const exactMap = new Map()
const exactDups = []
for (const it of items) {
  if (exactMap.has(it.qn)) exactDups.push([exactMap.get(it.qn), it])
  else exactMap.set(it.qn, it)
}

// ② 近似对：题干或知识点 Jaccard ≥ 阈值。O(n²)，745 题约 27 万对，秒级。
const pairs = []
for (let a = 0; a < items.length; a++) {
  for (let b = a + 1; b < items.length; b++) {
    const A = items[a], B = items[b]
    const qs = jaccard(A.qg, B.qg)
    const fs = A.fg.size && B.fg.size ? jaccard(A.fg, B.fg) : 0
    const sim = Math.max(qs, fs)
    if (sim >= THRESHOLD) pairs.push({ A, B, qs, fs, sim, sameCard: A.cardId === B.cardId })
  }
}
pairs.sort((x, y) => y.sim - x.sim)

// ③ 阈值分布直方图
const buckets = { '0.90+': 0, '0.80-0.90': 0, '0.70-0.80': 0, '0.60-0.70': 0, '0.55-0.60': 0 }
for (const p of pairs) {
  if (p.sim >= 0.9) buckets['0.90+']++
  else if (p.sim >= 0.8) buckets['0.80-0.90']++
  else if (p.sim >= 0.7) buckets['0.70-0.80']++
  else if (p.sim >= 0.6) buckets['0.60-0.70']++
  else buckets['0.55-0.60']++
}

console.log(`\n===== 题库相似度审核（共 ${quizzes.length} 题，阈值 ${THRESHOLD}）=====`)
console.log(`\n① 精确重复（归一化题干完全相同）: ${exactDups.length} 对`)
for (const [a, b] of exactDups) console.log(`   ⚠️ [#${a.i} ${a.cardId}] ↔ [#${b.i} ${b.cardId}]  「${a.q}」`)

console.log(`\n② 近似对分布（sim = max(题干Jaccard, 知识点Jaccard)）:`)
for (const [k, v] of Object.entries(buckets)) console.log(`   ${k}: ${v} 对`)
console.log(`   合计 ≥${THRESHOLD}: ${pairs.length} 对（同卡 ${pairs.filter(p => p.sameCard).length} / 跨卡 ${pairs.filter(p => !p.sameCard).length}）`)

const SHOW = Math.min(pairs.length, 40)
console.log(`\n③ 最像的 ${SHOW} 对（优先看跨卡的——同卡多面通常是有意的）:`)
for (const p of pairs.slice(0, SHOW)) {
  const tag = p.sameCard ? '同卡' : '🔺跨卡'
  console.log(`\n   sim=${p.sim.toFixed(2)}(题${p.qs.toFixed(2)}/识${p.fs.toFixed(2)}) ${tag} [${p.A.cardId}/${p.A.type} vs ${p.B.cardId}/${p.B.type}]`)
  console.log(`     A#${p.A.i}: ${p.A.q}`)
  console.log(`     B#${p.B.i}: ${p.B.q}`)
}
console.log('')
