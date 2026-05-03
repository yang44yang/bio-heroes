import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BattleCard from './Card'

// Phase A Step 1: 基础胶囊 + 翻牌容器（差异化在 Step 2 添加）
//
// 时序（单抽约 2s，十连约 3s）：
//   capsule  : 胶囊出现 + 旋转
//   crack    : 胶囊咔嚓裂开
//   reveal   : 卡牌依次翻面
//   done     : 调用 onDone 回到 GachaScreen

const FALLBACK_FLIP = { flipDuration: 500, glowColor: 'cyan' }

export default function GachaAnimation({ cards, onDone }) {
  const [phase, setPhase] = useState('capsule')
  const [revealedCount, setRevealedCount] = useState(0)
  const isMulti = cards.length > 1

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('crack'), 700)
    const t2 = setTimeout(() => setPhase('reveal'), 1000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  useEffect(() => {
    if (phase !== 'reveal') return
    if (revealedCount >= cards.length) {
      const t = setTimeout(() => onDone(), 600)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setRevealedCount(c => c + 1), revealedCount === 0 ? 200 : 180)
    return () => clearTimeout(t)
  }, [phase, revealedCount, cards.length, onDone])

  return (
    <motion.div
      className="fixed inset-0 z-[120] bg-black/85 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* === 胶囊阶段 === */}
      <AnimatePresence>
        {(phase === 'capsule' || phase === 'crack') && (
          <motion.div
            key="capsule"
            className="absolute"
            initial={{ scale: 0, rotate: 0 }}
            animate={
              phase === 'capsule'
                ? { scale: 1, rotate: 720 }
                : { scale: [1, 1.4, 0], rotate: 720 }
            }
            exit={{ opacity: 0 }}
            transition={{ duration: phase === 'capsule' ? 0.7 : 0.3, ease: 'easeOut' }}
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-300 via-blue-500 to-purple-700 shadow-2xl shadow-cyan-400/60 flex items-center justify-center text-3xl border-4 border-white/40">
              🧬
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === 翻牌阶段 === */}
      {phase === 'reveal' && (
        <div className={`flex flex-wrap gap-3 justify-center max-w-md px-4 ${isMulti ? '' : 'scale-110'}`}>
          {cards.map((card, i) => {
            const flipped = i < revealedCount
            return (
              <CardFlip
                key={i}
                card={card}
                flipped={flipped}
                effect={FALLBACK_FLIP}
              />
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

function CardFlip({ card, flipped, effect }) {
  return (
    <div className="relative" style={{ perspective: 800 }}>
      <motion.div
        className="relative w-[88px] h-[120px]"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: effect.flipDuration / 1000, ease: 'easeInOut' }}
      >
        {/* 卡背 */}
        <div
          className="absolute inset-0 rounded-xl border-2 border-cyan-400/60 bg-gradient-to-br from-blue-700 via-purple-800 to-blue-900 flex items-center justify-center text-2xl"
          style={{ backfaceVisibility: 'hidden' }}
        >
          ✨
        </div>
        {/* 卡正面 */}
        <div
          className="absolute inset-0 rounded-xl overflow-hidden"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <BattleCard card={card} hp={card.hp || 0} maxHp={card.hp || 1} isPlayer={true} isActive={false} />
        </div>
      </motion.div>
    </div>
  )
}
