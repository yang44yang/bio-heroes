// 游戏设置（localStorage 持久化，与存档分开）。当前：题库模式。
// quizMode: 'any'  软混合（场上有卡保证部分卡相关 + 通用题）— 默认
//           'card' 只出与场上卡牌相关的题
const KEY = 'bio-heroes-settings'
const DEFAULTS = { quizMode: 'any' }

function read() {
  try {
    if (typeof localStorage === 'undefined') return { ...DEFAULTS }
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }
  } catch { return { ...DEFAULTS } }
}

function write(patch) {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(KEY, JSON.stringify({ ...read(), ...patch }))
  } catch { /* noop */ }
}

export function getQuizMode() {
  return read().quizMode === 'card' ? 'card' : 'any'
}

export function setQuizMode(mode) {
  write({ quizMode: mode === 'card' ? 'card' : 'any' })
}
