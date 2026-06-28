#!/usr/bin/env node
// 题库系统升级测试：通用题 schema + getRandomQuiz 模式 + 当天不重复 + 降级。
// getRandomQuiz 依赖 localStorage（当天去重）→ 这里用 Map 垫片，便于在 node 里测持久化逻辑。
const _store = new Map()
globalThis.localStorage = {
  getItem: k => (_store.has(k) ? _store.get(k) : null),
  setItem: (k, v) => _store.set(k, String(v)),
  removeItem: k => _store.delete(k),
  clear: () => _store.clear(),
}
const clearSeen = () => _store.clear()

const { quizzes, getRandomQuiz, resetQuizHistory } = await import('../src/data/quizzes.js')
const { generalQuizzes } = await import('../src/data/quizzesGeneral.js')

let pass = 0, fail = 0
const ok = (n, c) => { if (c) pass++; else { fail++; console.error(`❌ ${n}`) } }

// ===== A. 通用题 schema =====
const ALLOWED_DIFF = ['easy', 'medium', 'hard']
const ALLOWED_TYPE = ['memorization', 'mechanism', 'inference']
ok(`通用题数量 ≥ 60（实际 ${generalQuizzes.length}）`, generalQuizzes.length >= 60)
for (const q of generalQuizzes) {
  ok(`通用题 "${(q.id || q.q).slice(0, 16)}" scope=general`, q.scope === 'general')
  ok(`通用题 "${q.id}" cardId=null`, q.cardId === null)
  ok(`通用题 "${q.id}" 有 category`, !!q.category)
  ok(`通用题 "${q.id}" 选项=4`, Array.isArray(q.options) && q.options.length === 4)
  ok(`通用题 "${q.id}" answer 0-3`, q.answer >= 0 && q.answer <= 3)
  ok(`通用题 "${q.id}" 有 fact`, !!q.fact)
  ok(`通用题 "${q.id}" difficulty 合法`, ALLOWED_DIFF.includes(q.difficulty))
  ok(`通用题 "${q.id}" type 合法`, ALLOWED_TYPE.includes(q.type))
}
ok('通用题 id 唯一', new Set(generalQuizzes.map(q => q.id)).size === generalQuizzes.length)
ok('通用题覆盖 ≥4 个类别', new Set(generalQuizzes.map(q => q.category)).size >= 4)
ok('通用题覆盖三难度', ['easy', 'medium', 'hard'].every(d => generalQuizzes.some(q => q.difficulty === d)))
ok('通用题以机制/推理为主（mechanism+inference ≥ 一半）',
  generalQuizzes.filter(q => q.type !== 'memorization').length >= generalQuizzes.length / 2)

// ===== B. 合并池 + 稳定 _qid =====
ok('quizzes 含卡题 + 通用题', quizzes.length === quizzes.filter(q => (q.scope || 'card') === 'card').length + generalQuizzes.length)
ok('每题都有 _qid', quizzes.every(q => !!q._qid))
// _qid 可在"完全相同的题干"上重复（合理：同一题挂在两张卡上，当天去重应按内容算一次）；
// 但不同题干绝不能撞同一 _qid（那才是 hash 碰撞 bug）。
{
  const byQid = {}
  for (const q of quizzes) (byQid[q._qid] = byQid[q._qid] || new Set()).add(q.q)
  const realCollisions = Object.entries(byQid).filter(([, qs]) => qs.size > 1)
  ok('_qid 无 hash 碰撞（撞 id 的都是完全相同题干）', realCollisions.length === 0)
}
ok('卡题 scope 默认 card', quizzes.filter(q => q.cardId).every(q => q.scope === 'card'))

// 工具：从返回结果反查是否卡题/通用题
const isGeneralQ = res => res.cardId === null || res.cardId === undefined

// ===== C. mode 'card'：只出卡相关题 =====
clearSeen()
{
  // 取一张确有题的卡 id
  const someCardId = quizzes.find(q => q.cardId)?.cardId
  let allCard = true
  for (let i = 0; i < 30; i++) {
    const r = getRandomQuiz({ battleCardIds: [someCardId], streak: 0, mode: 'card' })
    if (isGeneralQ(r)) { allCard = false; break }
  }
  ok("mode 'card'：30 连抽全是卡题（不混通用）", allCard)
}

// ===== D. mode 'any'：软混合，卡题与通用题都会出 =====
clearSeen()
{
  const someCardId = quizzes.find(q => q.cardId)?.cardId
  let sawCard = false, sawGeneral = false
  for (let i = 0; i < 60; i++) {
    const r = getRandomQuiz({ battleCardIds: [someCardId], streak: 0, mode: 'any' })
    if (isGeneralQ(r)) sawGeneral = true; else sawCard = true
  }
  ok("mode 'any'：60 连抽里卡题和通用题都出现", sawCard && sawGeneral)
}

// ===== E. 当天不重复（核心诉求③）=====
clearSeen()
{
  const seen = new Set()
  let dupBeforeExhaust = false
  // 无 battleCardIds + any → 走通用池（63 题）；连抽 50 次应全不重复
  for (let i = 0; i < 50; i++) {
    const r = getRandomQuiz({ battleCardIds: [], streak: 0, mode: 'any' })
    if (seen.has(r.question)) { dupBeforeExhaust = true; break }
    seen.add(r.question)
  }
  ok('当天不重复：50 连抽（池未抽干）无重复题', !dupBeforeExhaust && seen.size === 50)
}

// ===== F. resetQuizHistory 现为 no-op：跨局仍不重复 =====
clearSeen()
{
  const first = new Set()
  for (let i = 0; i < 15; i++) first.add(getRandomQuiz({ battleCardIds: [], streak: 0, mode: 'any' }).question)
  resetQuizHistory() // 旧行为会清空 → 现应 no-op
  let repeated = false
  for (let i = 0; i < 15; i++) {
    const q = getRandomQuiz({ battleCardIds: [], streak: 0, mode: 'any' }).question
    if (first.has(q)) { repeated = true; break }
  }
  ok('resetQuizHistory no-op：跨“局”仍避开已出题（当天去重保持）', !repeated)
}

// ===== G. 跨天自动重置 =====
clearSeen()
{
  // 伪造一条“旧日期 + 已出满”的记录 → 应被视为新的一天、忽略旧 ids
  _store.set('bio-heroes-quiz-seen', JSON.stringify({ date: '2000-01-01', ids: quizzes.map(q => q._qid) }))
  const r = getRandomQuiz({ battleCardIds: [], streak: 0, mode: 'any' })
  ok('跨天重置：旧日期 seen 被忽略，仍能正常出题', !!r && !!r.question)
  const stored = JSON.parse(_store.get('bio-heroes-quiz-seen'))
  ok('跨天重置：seen 记录的 date 更新为今天', stored.date !== '2000-01-01')
}

// ===== H. 抽干降级：不卡住、始终返回题 =====
clearSeen()
{
  // 只有 ~3 题的卡，连抽 12 次（远超题数）→ 抽干后允许重复，但绝不返回空/报错
  const cardId = quizzes.find(q => q.cardId)?.cardId
  let alwaysReturned = true
  for (let i = 0; i < 12; i++) {
    const r = getRandomQuiz({ battleCardIds: [cardId], streak: 0, mode: 'card' })
    if (!r || !r.question || !Array.isArray(r.options)) { alwaysReturned = false; break }
  }
  ok('抽干降级：小池连抽 12 次始终返回有效题（不卡住）', alwaysReturned)
}

console.log(`\n${fail === 0 ? '✅' : '⚠️'} 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
