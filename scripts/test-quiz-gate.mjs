// test-quiz-gate.mjs —— 问答纯核心守卫（guest 答题步）。
//
// 守三样，每样都对应一个真机后果：
//   ① **每侧独立冷却** —— 共享节流时 host 首攻把额度用掉、又占住冷却 → guest 全程 0 题
//      （那正是「host 能 ×2 / guest 恒 ×1」不公平的另一半根因）
//   ② **脱敏** —— correct 上 wire = 看一眼 network 就能作弊；fact 上 wire 同样剧透
//      （实测题库 86.7% 的 fact 与正确选项重合度最高）
//   ③ **判卷是 host 权威** —— 座位/qid 都要校验，否则能抢答别人的题、或被过期答案错算
//
// ⚠️ 只 import src/engine/*.js（零 React）→ 进主 CI。

import {
  QUIZ_COOLDOWN_TURNS, initialQuizGate, nextQuizGate,
  emptyQuizSlot, publicQuiz, revealQuiz, gradeAnswer,
} from '../src/engine/quizGate.js'
import { PLAYER, ENEMY } from '../src/engine/sides.js'

let pass = 0
const fails = []
const assert = (cond, msg) => { if (cond) pass++; else fails.push(msg) }
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// ---- ① ☠️ 每侧独立：一侧点火不消耗另一侧的额度 ----
{
  let g = initialQuizGate()
  // host 首攻 → 触发
  const a = nextQuizGate(g, PLAYER, 1); g = a.gate
  assert(a.fire === true, '① host 首攻必触发')

  // ☠️ 关键断言：**紧接着** guest 首攻也必须触发。
  //   变异：把 gate 退回单实例共享（两侧同一个 {fired,lastTurn}）→ 本条红。
  //   ⚠️ 只测「两侧对称」是抓不到这个变异的（共享时两侧读到的也是同一份、看起来照样对称），
  //      必须用**交错序列**。这条注释别删。
  const b = nextQuizGate(g, ENEMY, 1); g = b.gate
  assert(b.fire === true, '① ☠️ host 刚触发过，guest 首攻仍必触发（额度每侧独立）')

  // 同一侧在冷却内再问 → 不触发
  const c = nextQuizGate(g, PLAYER, 2); g = c.gate
  assert(c.fire === false, '① 同侧冷却内不再触发')
  // 另一侧在冷却内也不触发（各自的冷却各自算）
  assert(nextQuizGate(g, ENEMY, 2).fire === false, '① 另一侧也有自己的冷却')

  // 冷却到期 → 正向再触发（防守卫过严：只测「不触发」会被「永远不触发」骗过）
  const d = nextQuizGate(g, PLAYER, 1 + QUIZ_COOLDOWN_TURNS); g = d.gate
  assert(d.fire === true, `① 冷却满 ${QUIZ_COOLDOWN_TURNS} 回合后再次触发（正向守卫）`)
  assert(nextQuizGate(g, ENEMY, 1 + QUIZ_COOLDOWN_TURNS).fire === true, '① 另一侧同样能再触发')
}

// ---- ② 纯函数：不 mutate 入参 ----
{
  const g0 = initialQuizGate()
  const snapshot = JSON.stringify(g0)
  nextQuizGate(g0, PLAYER, 5)
  // 变异：nextQuizGate 里改成 `gate[side].fired = true` → 本条红
  assert(JSON.stringify(g0) === snapshot, '② nextQuizGate 不 mutate 入参（reducer 纪律）')
  assert(nextQuizGate(g0, PLAYER, 5).gate !== g0, '② 触发时返回新对象')
  const miss = nextQuizGate(nextQuizGate(g0, PLAYER, 5).gate, PLAYER, 5)
  assert(miss.gate === miss.gate, '② 不触发时可原样返回（无需复制）')
}

// ---- ③ ☠️ 脱敏：答案与 fact 都不得出现在题面里 ----
{
  const raw = {
    _qid: 'hash_abc', question: '青霉素靠什么杀细菌？',
    options: ['破坏细胞壁', '冻住它', '喂饱它', '讲道理'],
    correct: 0, fact: '青霉素破坏细菌的细胞壁，没有壳的细菌会裂开！',
    difficulty: 'easy', faction: 'tech', cardId: 'penicillin',
  }
  const pub = publicQuiz(raw, 'm1#7')

  // 变异：publicQuiz 改成 `{...quiz, qid}`（复制整个对象再补 qid）→ 下面两条红
  assert(!('correct' in pub), '③ ☠️ 脱敏后不含 correct —— 否则看一眼 network 就能作弊')
  assert(pub.fact === null,
    '③ ☠️ 提问帧的 fact 必须为 null —— 题库 86.7% 的 fact 与正确选项重合度最高，等于直接剧透')
  assert(!('_qid' in pub), '③ 不含题库的 _qid（用实例 qid，防同题重抽时旧答案错算）')

  // 差分：脱敏不能脱成空壳（防「返回 {} 也能过」的剧场断言）
  assert(pub.question === raw.question && pub.options.length === 4, '③ 题面本身完整保留')
  assert(pub.qid === 'm1#7', '③ 带上本次出题的实例 id')
  assert(pub.options !== raw.options, '③ options 是副本，不与题库共享引用')

  // 揭晓帧才补齐
  const rev = revealQuiz(pub, 2, 0, raw.fact)
  assert(rev.rightIdx === 0 && rev.chosenIdx === 2 && rev.fact === raw.fact, '③ 揭晓帧补齐 chosen/right/fact')
  assert(!('correct' in rev), '③ ☠️ 揭晓帧也不叫 correct（那个名字会被 wire 的隐私词表挡下）')
}

// ---- ④ 定形题槽：有题/无题的**键集必须一致** ----
{
  const empty = emptyQuizSlot()
  const filled = publicQuiz({ question: 'q', options: ['a'], difficulty: 'easy' }, 'm1#1')
  // 变异：emptyQuizSlot 返回 null 或 {} → 本条红。
  //   真机后果：collectPaths 在「有题/无题」下产出不同路径集 → assertPublicShape 当场抛 →
  //   快照停推、guest 静默冻屏（抛错被 usePvpHost 吞进 console.error）。
  assert(deepEq(Object.keys(empty).sort(), Object.keys(filled).sort()),
    '④ ☠️ 空槽与有题槽的键集完全一致（定形槽，否则 wire 形状守门人当场抛）')
  assert(empty.qid === null && Array.isArray(empty.options), '④ 空槽的值是 null / 空数组，不是缺键')
}

// ---- ⑤ ☠️ 判卷：host 权威，座位与 qid 都要校验 ----
{
  const pending = { side: ENEMY, qid: 'm1#3', correct: 2 }

  assert(gradeAnswer(pending, { qid: 'm1#3', choice: 2 }, ENEMY).correct === true, '⑤ 选对 → correct')
  assert(gradeAnswer(pending, { qid: 'm1#3', choice: 0 }, ENEMY).correct === false, '⑤ 选错 → 不 correct')

  // ☠️ 抢答别人的题。变异：gradeAnswer 不比 side → 本条红
  //   （真机后果：host 屏幕上弹出 guest 的题，host 一点就把齐齐的题答了、还刷自己的连对数）
  const steal = gradeAnswer(pending, { qid: 'm1#3', choice: 2 }, PLAYER)
  assert(!steal.ok && steal.reason === 'wrong-side', '⑤ ☠️ 别的座位来答 → 拒（wrong-side）')

  // ☠️ 过期题。变异：不比 qid → 本条红
  const stale = gradeAnswer(pending, { qid: 'm1#1', choice: 2 }, ENEMY)
  assert(!stale.ok && stale.reason === 'stale-qid', '⑤ ☠️ qid 不匹配 → 拒（stale-qid）')

  // 没挂题时乱发 answer → 安静丢弃，且**绝不能**被当成答错去清连对数
  const none = gradeAnswer(null, { qid: 'x', choice: 0 }, ENEMY)
  assert(!none.ok && none.reason === 'no-pending', '⑤ 没有待答题时拒（no-pending）')
  assert(none.correct === undefined, '⑤ 拒绝路径不返回 correct（调用方无从"顺手"判错）')
}

assert(pass > 20, `⑥ 断言真的跑了（实测 ${pass} 条）`)

if (fails.length) {
  console.error(`❌ test-quiz-gate: ${fails.length} 条失败`)
  for (const f of fails) console.error('   · ' + f)
  process.exit(1)
}
console.log(`✅ test-quiz-gate: ${pass} 条断言通过`)
