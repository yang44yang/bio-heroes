// matchStore.js —— 对局快照的落盘/取回（host 自恢复 / 4g 场景）。
//
// 纯核心（形状、往返陷阱、拒收闸）在 src/engine/matchSnapshot.js；本文件只管 localStorage
// 这一层 IO 与写入节流，好让纯核心保持可在 Node 里测。
//
// ☠️ 这份数据**绝不进存档**（已登记 saveManager 的 NON_SAVE_KEYS）：它装着中继 token
//    和双方手牌 + 问答答案卡。跟着导出的存档旅行 = 把「回到那间房」的凭证和整堵隐私墙一起送人。

import { packMatch, readSnapshot, isResumable } from '../engine/matchSnapshot.js'

export const MATCH_KEY = 'bio-heroes-pvp-match'

/** 写入节流：45KB 量级的 JSON.stringify 挂在每次 dispatch 后，低端 iPad 上肉眼可见地抖。 */
const WRITE_THROTTLE_MS = 1200
let lastWriteAt = 0
let pendingTimer = null

const safeSet = (text) => {
  try {
    localStorage.setItem(MATCH_KEY, text)
    return true
  } catch (err) {
    // 配额满 / 隐身模式 / 站点数据被禁 —— 续局是**增强**，不能因为存不下就打断正在进行的对局
    console.warn('[matchStore] 快照写入失败（续局将不可用）:', err?.name || err)
    return false
  }
}

/**
 * 存一份快照。带节流：距上次写入不足 WRITE_THROTTLE_MS 就挂一个尾随写入。
 * ⚠️ 尾随写入用的是**调用时**打好的那份 blob（不是"稍后再取一次") ——
 *    取快照要读 React 的当前值，晚了就读到别的帧了。
 */
export function saveMatch(parts, { now = Date.now(), force = false } = {}) {
  let text
  try {
    text = JSON.stringify(packMatch({ ...parts, meta: { ...parts.meta, at: now } }))
  } catch (err) {
    console.warn('[matchStore] 快照序列化失败:', err)
    return false
  }
  if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null }
  if (force || now - lastWriteAt >= WRITE_THROTTLE_MS) {
    lastWriteAt = now
    return safeSet(text)
  }
  pendingTimer = setTimeout(() => {
    pendingTimer = null
    lastWriteAt = Date.now()
    safeSet(text)
  }, WRITE_THROTTLE_MS - (now - lastWriteAt))
  return true
}

/** 取回一份**可用**的快照：版本/凭证/过期/形状任一不合就返回 null（判据在纯核心里）。 */
export function loadMatch(now = Date.now()) {
  let raw
  try { raw = localStorage.getItem(MATCH_KEY) } catch { return null }
  const snap = readSnapshot(raw, now)
  if (!snap) return null
  return isResumable(snap) ? snap : null      // 已分胜负的局不提示续局
}

export function clearMatch() {
  if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null }
  try { localStorage.removeItem(MATCH_KEY) } catch { /* 忽略 */ }
}
