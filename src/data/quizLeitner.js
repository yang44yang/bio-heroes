// Leitner 间隔复习 — 把问答从"随机 trivia"升级成"个性化记忆训练"。
// 每道题(按稳定 _qid)在一个盒子里；答对升盒(下次隔更久)、答错回 Box1(明天再考)。
// 全是纯函数 + 一个 localStorage 存储 → 核心逻辑可被 scripts/test-quiz-leitner.mjs 单测。
// 选题(quizzes.getRandomQuiz)优先出"到期"题；答题(useBattle.answerQuiz)后更盒子。
import { localDateStr, dayNumber } from './dailyChallenges.js'

const LEITNER_KEY = 'bio-heroes-quiz-leitner'
// 盒子 → 复习间隔(天)。针对 7 岁：更短更密，间隔别拉太长让他忘光。
export const BOX_INTERVALS = { 1: 1, 2: 2, 3: 3, 4: 5, 5: 8 }
export const MAX_BOX = 5
export const MASTERED_BOX = 4 // box ≥ 4(答对 ≥3 次、间隔 5-8 天)视为"掌握"

// 今天的天数(距 1970 的本地天数，与 dailyChallenges 同源，跨设备一致)
export function todayNum() { return dayNumber(localDateStr(new Date())) }

export function readLeitner() {
  try {
    if (typeof localStorage === 'undefined') return {}
    const raw = localStorage.getItem(LEITNER_KEY)
    const obj = raw ? JSON.parse(raw) : {}
    return obj && typeof obj === 'object' ? obj : {}
  } catch { return {} }
}
function writeLeitner(map) {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(LEITNER_KEY, JSON.stringify(map)) } catch { /* localStorage 不可用：退化为无记忆，不影响出题 */ }
}

// 纯函数：给定当前 entry(可空=新题) + 对错 + 今天 → 新 entry。不碰 localStorage，便于单测。
export function nextBox(entry, correct, today) {
  const box = entry?.box || 1
  const newBox = correct ? Math.min(box + 1, MAX_BOX) : 1 // 对→升一盒(封顶5)；错→回 Box1
  return { box: newBox, dueDay: today + BOX_INTERVALS[newBox] }
}

// 答题后记录(副作用：写 localStorage)。返回更新后的 entry。
export function recordQuizResult(qid, correct, today = todayNum()) {
  if (!qid) return null
  const map = readLeitner()
  map[qid] = nextBox(map[qid], correct, today)
  writeLeitner(map)
  return map[qid]
}

// 一道题是否"到期"：无记录=新题=到期；dueDay ≤ 今天=到期。
export function isDue(qid, map = readLeitner(), today = todayNum()) {
  const e = map[qid]
  return !e || e.dueDay <= today
}

// 复习进度统计(供 UI)。total = 题库总数(由调用方传入)。
//   mastered=已掌握(box≥4) · learning=复习中(见过但未掌握) · dueToday=见过且到期(复习积压) · seen=见过总数
export function getLeitnerStats(total, map = readLeitner(), today = todayNum()) {
  const entries = Object.values(map).filter(e => e && typeof e.box === 'number')
  const mastered = entries.filter(e => e.box >= MASTERED_BOX).length
  const learning = entries.filter(e => e.box < MASTERED_BOX).length
  const dueToday = entries.filter(e => e.dueDay <= today).length
  return { mastered, learning, dueToday, seen: entries.length, total: total || 0 }
}
