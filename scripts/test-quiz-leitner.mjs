#!/usr/bin/env node
// Leitner 间隔复习 纯函数执行式单测（2026-07-12）——
//   nextBox(升降盒 + dueDay 计算) / isDue(到期判定) / getLeitnerStats(复习进度统计) 都是纯函数
//   （接受 map/today 入参、不碰 localStorage）→ 直接 import 断言。选题优先到期 + 答题更盒子的接线
//   在 quizzes.getRandomQuiz / useBattle.answerQuiz，本测试锁住核心间隔逻辑。
import { nextBox, isDue, getLeitnerStats, BOX_INTERVALS, MAX_BOX, MASTERED_BOX } from '../src/data/quizLeitner.js'

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }
const T = 1000 // 假"今天"的天数

// ============ 间隔常量（针对 7 岁：更短更密 1/2/3/5/8）============
ok('BOX_INTERVALS = 1/2/3/5/8', BOX_INTERVALS[1] === 1 && BOX_INTERVALS[2] === 2 && BOX_INTERVALS[3] === 3 && BOX_INTERVALS[4] === 5 && BOX_INTERVALS[5] === 8)
ok('MAX_BOX 5 / MASTERED_BOX 4', MAX_BOX === 5 && MASTERED_BOX === 4)

// ============ nextBox：升盒 / 降盒 / dueDay ============
// 新题（无 entry）
ok('新题答对 → box2, dueDay=今天+2', (() => { const e = nextBox(undefined, true, T); return e.box === 2 && e.dueDay === T + 2 })())
ok('新题答错 → box1, dueDay=今天+1', (() => { const e = nextBox(undefined, false, T); return e.box === 1 && e.dueDay === T + 1 })())
ok('null entry 也当新题（box1 起）', nextBox(null, true, T).box === 2)
// 逐盒升
ok('box1 答对 → box2 (dueDay+2)', (() => { const e = nextBox({ box: 1, dueDay: T }, true, T); return e.box === 2 && e.dueDay === T + 2 })())
ok('box3 答对 → box4 (dueDay+5)', (() => { const e = nextBox({ box: 3, dueDay: T }, true, T); return e.box === 4 && e.dueDay === T + 5 })())
ok('box5 答对 → 封顶 box5 (dueDay+8)', (() => { const e = nextBox({ box: 5, dueDay: T }, true, T); return e.box === 5 && e.dueDay === T + 8 })())
// 答错一律回 Box1
ok('box4 答错 → 打回 box1 (dueDay+1)', (() => { const e = nextBox({ box: 4, dueDay: T }, false, T); return e.box === 1 && e.dueDay === T + 1 })())
ok('box5 答错 → 打回 box1', nextBox({ box: 5, dueDay: T }, false, T).box === 1)
// 连对一路到顶：1→2→3→4→5→5
ok('连对 5 次 1→2→3→4→5→封顶5', (() => {
  let e
  e = nextBox(undefined, true, T)      // 2
  e = nextBox(e, true, T)              // 3
  e = nextBox(e, true, T)              // 4
  e = nextBox(e, true, T)              // 5
  e = nextBox(e, true, T)              // 5(cap)
  return e.box === 5
})())

// ============ isDue：到期判定 ============
const map = { q_new_never: undefined, q_due: { box: 2, dueDay: T }, q_overdue: { box: 3, dueDay: T - 5 }, q_future: { box: 4, dueDay: T + 3 } }
ok('无记录（新题）→ 到期', isDue('q_absent', map, T) === true)
ok('dueDay==今天 → 到期', isDue('q_due', map, T) === true)
ok('dueDay<今天（逾期）→ 到期', isDue('q_overdue', map, T) === true)
ok('dueDay>今天（未来）→ 不到期', isDue('q_future', map, T) === false)

// ============ getLeitnerStats：复习进度 ============
{
  const m = {
    a: { box: 5, dueDay: T + 8 },   // 掌握、不到期
    b: { box: 4, dueDay: T - 1 },   // 掌握、到期
    c: { box: 2, dueDay: T + 2 },   // 复习中、不到期
    d: { box: 1, dueDay: T },       // 复习中、到期
    e: { box: 3, dueDay: T - 3 },   // 复习中、到期
  }
  const s = getLeitnerStats(745, m, T)
  ok('mastered = box≥4 共 2（a,b）', s.mastered === 2)
  ok('learning = box<4 共 3（c,d,e）', s.learning === 3)
  ok('dueToday = dueDay≤今天 共 3（b,d,e）', s.dueToday === 3)
  ok('seen = 5、total = 745', s.seen === 5 && s.total === 745)
}
ok('空 map → 全 0、total 透传', (() => { const s = getLeitnerStats(745, {}, T); return s.mastered === 0 && s.learning === 0 && s.dueToday === 0 && s.seen === 0 && s.total === 745 })())
ok('脏 map（非法 entry）被过滤、不抛', (() => { const s = getLeitnerStats(10, { x: null, y: { box: 5, dueDay: T }, z: 'junk' }, T); return s.seen === 1 && s.mastered === 1 })())

console.log(`\n${fail === 0 ? '✅' : '❌'} quiz-leitner 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
