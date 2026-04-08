// BattleHints — 闯关中的即时提示系统（Sprint 21）
// 根据玩家行为弹出一次性提示，不阻断战斗流程

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const HINTS_KEY = 'bio-heroes-hints-seen'

function loadHintsSeen() {
  try {
    return JSON.parse(localStorage.getItem(HINTS_KEY) || '{}')
  } catch { return {} }
}

function saveHintSeen(hintId) {
  const seen = loadHintsSeen()
  seen[hintId] = true
  localStorage.setItem(HINTS_KEY, JSON.stringify(seen))
}

// 提示定义
const HINTS = {
  power_bank: {
    zh: '💡 没用完的能量会存入 Power Bank！攒够了点"打破"一次性释放',
    en: '💡 Unused energy goes to the Power Bank! Save up and break it to release all at once',
    once: true,
  },
  sp_card: {
    zh: '💡 SP 卡是你的秘密武器！通过事件卡满足条件后可以召唤',
    en: '💡 SP cards are your secret weapon! Summon them when event card conditions are met',
    once: true,
  },
  guard: {
    zh: '💡 对方有守护卡 🛡️，你必须先打掉它才能攻击其他目标',
    en: '💡 The enemy has a Guard card 🛡️ — you must attack it first before targeting others',
    once: true,
  },
  ssr_locked: {
    zh: '💡 SSR 卡需要弃牌堆的阵营标记才能出场，先出低费卡积累标记！',
    en: '💡 SSR cards need faction markers from the discard pile. Play cheap cards first to build markers!',
    once: true,
  },
  no_play: {
    zh: '💡 记得出牌！卡牌放到战场才能战斗',
    en: '💡 Remember to play cards! Cards must be on the field to fight',
    once: false,
  },
  skip_attack: {
    zh: '💡 你有卡可以攻击！确定要跳过吗？',
    en: '💡 You have cards that can attack! Sure you want to skip?',
    once: false,
  },
  event_card: {
    zh: '💡 环境事件会影响所有场上的卡牌。有些阵营会受到加强或削弱！',
    en: '💡 Environment events affect all cards on the field. Some factions get buffed or weakened!',
    once: true,
  },
}

/**
 * useBattleHints — hook for managing battle hints
 * Returns { showHint, activeHint, dismissHint }
 */
export function useBattleHints(lang) {
  const [activeHint, setActiveHint] = useState(null)
  const seenRef = useRef(loadHintsSeen())
  const timerRef = useRef(null)

  const dismissHint = useCallback(() => {
    setActiveHint(null)
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const showHint = useCallback((hintId) => {
    const hint = HINTS[hintId]
    if (!hint) return
    if (hint.once && seenRef.current[hintId]) return

    if (hint.once) {
      saveHintSeen(hintId)
      seenRef.current[hintId] = true
    }

    const text = lang === 'en' ? hint.en : hint.zh
    setActiveHint({ id: hintId, text })

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setActiveHint(null), 4000)
  }, [lang])

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  return { showHint, activeHint, dismissHint }
}

/**
 * BattleHintOverlay — floating hint display
 */
export function BattleHintOverlay({ hint, onDismiss }) {
  if (!hint) return null
  return (
    <AnimatePresence>
      <motion.div
        key={hint.id}
        className="fixed top-14 left-1/2 -translate-x-1/2 z-[90] max-w-sm w-[90%]"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <div
          className="bg-yellow-900/95 border border-yellow-500/60 rounded-xl px-4 py-2.5 text-sm text-yellow-100 shadow-lg shadow-yellow-900/30 cursor-pointer"
          onClick={onDismiss}
        >
          {hint.text}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
