import { useState, useRef, useEffect, useCallback } from 'react'
import {
  getDailyChallenge, localDateStr, computeStreakUpdate, computeReward,
} from '../data/dailyChallenges.js'

// 每日挑战状态 — 独立 localStorage，不污染 economy / campaign / decks
const STORAGE_KEY = 'bio-heroes-daily'
const DEFAULT_STATE = {
  saveVersion: 1,
  lastCompleteDate: null,   // 'YYYY-MM-DD'
  currentStreak: 0,
  maxStreak: 0,
  totalCompleted: 0,
  history: [],              // [{ date, streak, coins, ssrTicket }]
}

function loadDaily() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) } // spread 兜底新字段
  } catch (e) { /* ignore */ }
  return { ...DEFAULT_STATE }
}
function saveDaily(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch (e) { /* ignore */ }
}

/**
 * useDailyChallenge — 每日挑战
 * 客户端日期判定（new Date），无后端。完成=领奖原子化。
 */
export function useDailyChallenge() {
  const [state, setState] = useState(loadDaily)
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state; saveDaily(state) }, [state])

  const today = localDateStr(new Date())
  const todayChallenge = getDailyChallenge(today)
  const status = state.lastCompleteDate === today ? 'done' : 'incomplete'

  // 完成今日挑战并发奖（幂等 + 断签重置 + 时间回拨护栏）
  // 返回 { reward, streak } | { alreadyDone:true } | { rollback:true }
  const completeAndClaim = useCallback((battleResult, economy) => {
    const todayStr = localDateStr(new Date())
    const { status: st, next } = computeStreakUpdate(stateRef.current, todayStr)
    if (st === 'already') return { alreadyDone: true }   // 今天已领，不二次发奖
    if (st === 'rollback') return { rollback: true }      // 系统时间往回拨，不发奖

    const challenge = getDailyChallenge(todayStr)
    const reward = computeReward(challenge, battleResult || {}, next.currentStreak)

    if (reward.coins) economy.addCoins(reward.coins)
    if (reward.ssrTicket) economy.useSSRTicket?.()
    if (reward.fragmentCardId && reward.fragmentCount) economy.addFragments?.(reward.fragmentCardId, reward.fragmentCount)

    const history = [
      ...((next.history || []).filter(h => h.date !== todayStr)),
      { date: todayStr, streak: next.currentStreak, coins: reward.coins, ssrTicket: reward.ssrTicket },
    ].slice(-14)
    const persisted = { ...next, history }
    stateRef.current = persisted
    setState(persisted)
    return { reward, streak: next.currentStreak }
  }, [])

  return {
    today,
    todayChallenge,
    status,                                 // 'incomplete' | 'done'
    currentStreak: state.currentStreak || 0,
    maxStreak: state.maxStreak || 0,
    totalCompleted: state.totalCompleted || 0,
    history: state.history || [],
    completeAndClaim,
  }
}
