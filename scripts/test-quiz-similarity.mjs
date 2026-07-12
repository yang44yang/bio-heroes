#!/usr/bin/env node
// 题库「防太相近」守卫（门禁）——任何两题（题干或知识点 fact 的中文 bigram Jaccard）≥ 阈值即红。
//   现库最高相似 0.68（3 对轻微跨卡重叠，见 audit-quiz-similarity.mjs），阈值 0.70 → 当前通过。
//   作用：扩题时若不小心加了与老题近乎重复的新题，CI 当场咬住 → 逼你差异化或丢弃。
//   细审用 `node scripts/audit-quiz-similarity.mjs [更低阈值]`（信息性、非门禁）。
import { quizzes } from '../src/data/quizzes.js'

const THRESHOLD = 0.70

const norm = (s) => (s || '').toLowerCase().replace(/[^一-龥a-z0-9]/g, '')
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

const items = quizzes.map((q, i) => ({ i, q: q.q, cardId: q.cardId || (q.scope === 'general' ? '通用' : '?'), qg: bigrams(q.q), fg: bigrams(q.fact || ''), qn: norm(q.q) }))

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }

// ① 无精确重复（归一化题干完全相同）
const seen = new Map(); const exact = []
for (const it of items) { if (seen.has(it.qn)) exact.push([seen.get(it.qn), it]); else seen.set(it.qn, it) }
ok(`无精确重复题干（${exact.length} 对）${exact.length ? ' → ' + exact.map(([a, b]) => `#${a.i}↔#${b.i}`).join(',') : ''}`, exact.length === 0)

// ② 无 ≥阈值 的近似对
const over = []
for (let a = 0; a < items.length; a++) {
  for (let b = a + 1; b < items.length; b++) {
    const A = items[a], B = items[b]
    const sim = Math.max(jaccard(A.qg, B.qg), (A.fg.size && B.fg.size) ? jaccard(A.fg, B.fg) : 0)
    if (sim >= THRESHOLD) over.push({ A, B, sim })
  }
}
over.sort((x, y) => y.sim - x.sim)
if (over.length) for (const p of over.slice(0, 8)) console.error(`   ⚠️ sim=${p.sim.toFixed(2)} #${p.A.i}[${p.A.cardId}] ↔ #${p.B.i}[${p.B.cardId}]\n     A: ${p.A.q}\n     B: ${p.B.q}`)
ok(`无相似度 ≥${THRESHOLD} 的题对（${over.length} 对；细审跑 audit-quiz-similarity.mjs）`, over.length === 0)

console.log(`\n${fail === 0 ? '✅' : '❌'} quiz-similarity 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
