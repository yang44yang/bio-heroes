import React, { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BattleCard from './Card'
import { playSound } from '../audio/soundManager'

const SOUND_FOR_RARITY = {
  R: 'cardFlipNormal',
  SR: 'cardFlipSr',
  SSR: 'cardFlipSsr',
  SP: 'cardFlipSp',
}

// Phase A: 抽卡爽感 — 不同稀有度有不同翻面节奏 + 光效
//
// 时序：
//   capsule  : 胶囊出现 + 旋转
//   crack    : 胶囊咔嚓裂开
//   reveal   : 卡牌依次翻面（SR+ 翻到时停顿 + 闪光）
//   done     : 调用 onDone 回到 GachaScreen

const RARITY_EFFECTS = {
  R: {
    flipDuration: 400,
    glowColor: 'rgba(96,165,250,0.55)',
    glowRing: 'shadow-blue-400/40',
    pauseAfter: 0,
    haloDuration: 0,
    particleCount: 0,
    shake: 0,
    fullScreenFlash: false,
    bannerText: null,
  },
  SR: {
    flipDuration: 600,
    glowColor: 'rgba(192,132,252,0.7)',
    glowRing: 'shadow-purple-400/60 shadow-lg',
    pauseAfter: 220,
    haloDuration: 500,
    particleCount: 16,
    particleColor: 'rgba(216,180,254,0.95)',
    shake: 0,
    fullScreenFlash: false,
    bannerText: null,
  },
  SSR: {
    flipDuration: 800,
    glowColor: 'rgba(250,204,21,0.85)',
    glowRing: 'shadow-yellow-400/80 shadow-2xl',
    pauseAfter: 420,
    haloDuration: 900,
    particleCount: 36,
    particleColor: 'rgba(253,224,71,0.95)',
    shake: 6,
    fullScreenFlash: false,
    bannerText: null,
  },
  SP: {
    flipDuration: 1100,
    glowColor: 'rgba(244,114,182,0.95)',
    glowRing: 'shadow-pink-400/90 shadow-2xl',
    pauseAfter: 1500,
    haloDuration: 1400,
    particleCount: 80,
    particleColor: 'rgba(255,180,220,1)',
    shake: 14,
    fullScreenFlash: true,
    bannerText: '⚡ SP 觉醒卡！',
  },
}

const FALLBACK_FLIP = RARITY_EFFECTS.R

const effectFor = (card) => {
  if (card?.type === 'sp') return RARITY_EFFECTS.SP
  return RARITY_EFFECTS[card?.rarity] || FALLBACK_FLIP
}

export default function GachaAnimation({ cards, onDone }) {
  const [phase, setPhase] = useState('capsule')
  const [revealedCount, setRevealedCount] = useState(0)
  const [activeBlast, setActiveBlast] = useState(null) // 当前正在闪的高稀有卡 effect
  const isMulti = cards.length > 1
  const containerRef = useRef(null)

  useEffect(() => {
    const t1 = setTimeout(() => { setPhase('crack'); playSound('capsuleCrack') }, 700)
    const t2 = setTimeout(() => setPhase('reveal'), 1000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  useEffect(() => {
    if (phase !== 'reveal') return
    if (revealedCount >= cards.length) {
      const t = setTimeout(() => onDone(), 700)
      return () => clearTimeout(t)
    }
    // 当前刚翻完的卡（如果有）的 pauseAfter 决定下一张延迟
    const justRevealed = cards[revealedCount - 1]
    const justEff = justRevealed ? effectFor(justRevealed) : null

    // 翻面音效
    if (justRevealed) {
      const rarity = justRevealed.type === 'sp' ? 'SP' : justRevealed.rarity
      playSound(SOUND_FOR_RARITY[rarity] || 'cardFlipNormal')
    }

    // SSR/SP 触发屏幕震动 + 全屏闪
    if (justEff && (justEff.shake > 0 || justEff.fullScreenFlash)) {
      setActiveBlast({ effect: justEff, key: revealedCount })
      const clear = setTimeout(() => setActiveBlast(null), justEff.haloDuration + 200)
      // 清理订阅
      const next = setTimeout(() => setRevealedCount(c => c + 1), 160 + justEff.pauseAfter)
      return () => { clearTimeout(clear); clearTimeout(next) }
    }

    const baseDelay = revealedCount === 0 ? 200 : 160
    const extraPause = justEff ? justEff.pauseAfter : 0
    const t = setTimeout(() => setRevealedCount(c => c + 1), baseDelay + extraPause)
    return () => clearTimeout(t)
  }, [phase, revealedCount, cards, onDone])

  // 震屏（基于当前 blast 的强度）
  const shakeIntensity = activeBlast?.effect.shake || 0

  return (
    <motion.div
      ref={containerRef}
      className="fixed inset-0 z-[120] bg-black/85 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        x: shakeIntensity ? [0, -shakeIntensity, shakeIntensity, -shakeIntensity * 0.6, shakeIntensity * 0.6, 0] : 0,
      }}
      transition={{ x: { duration: 0.4, ease: 'easeOut' } }}
      exit={{ opacity: 0 }}
    >
      {/* 全屏闪 — 仅 SP */}
      <AnimatePresence>
        {activeBlast?.effect.fullScreenFlash && (
          <motion.div
            key={`flash-${activeBlast.key}`}
            className="absolute inset-0 bg-white pointer-events-none z-[5]"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.95, 0] }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* SP 紫红脉冲背景 */}
      <AnimatePresence>
        {activeBlast?.effect.fullScreenFlash && (
          <motion.div
            key={`pulse-${activeBlast.key}`}
            className="absolute inset-0 pointer-events-none z-[3]"
            style={{ background: 'radial-gradient(circle at center, rgba(244,114,182,0.45) 0%, rgba(120,30,80,0.2) 50%, transparent 90%)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.6, 0] }}
            transition={{ duration: 1.6, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* 粒子爆发 */}
      <AnimatePresence>
        {activeBlast && activeBlast.effect.particleCount > 0 && (
          <ParticleBurst
            key={`burst-${activeBlast.key}`}
            count={activeBlast.effect.particleCount}
            color={activeBlast.effect.particleColor}
            duration={activeBlast.effect.haloDuration}
          />
        )}
      </AnimatePresence>

      {/* SP banner */}
      <AnimatePresence>
        {activeBlast?.effect.bannerText && (
          <motion.div
            key={`banner-${activeBlast.key}`}
            className="absolute top-[12%] left-1/2 -translate-x-1/2 z-[15] pointer-events-none"
            initial={{ opacity: 0, y: -20, scale: 0.7 }}
            animate={{ opacity: [0, 1, 1, 0], y: 0, scale: [0.7, 1.1, 1, 0.95] }}
            transition={{ duration: 1.5, times: [0, 0.2, 0.8, 1] }}
          >
            <div className="text-3xl font-black text-white tracking-wider px-6 py-2 rounded-full"
              style={{
                background: 'linear-gradient(90deg,rgba(236,72,153,0.85),rgba(168,85,247,0.85))',
                textShadow: '0 0 20px rgba(255,255,255,0.9), 0 0 40px rgba(236,72,153,0.8)',
                boxShadow: '0 0 30px rgba(236,72,153,0.6)',
              }}>
              {activeBlast.effect.bannerText}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                effect={effectFor(card)}
              />
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

function ParticleBurst({ count, color, duration }) {
  // 用 useState 锁定首次渲染时生成的粒子方向，避免每次 re-render 抖动
  const [particles] = useState(() =>
    Array.from({ length: count }, (_, i) => {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4
      const distance = 140 + Math.random() * 200
      const size = 4 + Math.random() * 6
      return {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        size,
        delay: Math.random() * 0.15,
      }
    })
  )
  const sec = duration / 1000

  return (
    <div className="absolute inset-0 pointer-events-none z-[10] flex items-center justify-center">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{ width: p.size, height: p.size, background: color, boxShadow: `0 0 ${p.size * 2}px ${color}` }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.3 }}
          transition={{ duration: sec, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

function CardFlip({ card, flipped, effect }) {
  return (
    <div className="relative" style={{ perspective: 800 }}>
      {/* 翻面瞬间的光晕扫过 */}
      <AnimatePresence>
        {flipped && effect.haloDuration > 0 && (
          <motion.div
            key="halo"
            className="absolute -inset-3 rounded-2xl pointer-events-none"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0, 0.9, 0], scale: [0.6, 1.4, 1.7] }}
            transition={{ duration: effect.haloDuration / 1000, ease: 'easeOut' }}
            style={{
              background: `radial-gradient(circle, ${effect.glowColor} 0%, transparent 70%)`,
            }}
          />
        )}
      </AnimatePresence>

      <motion.div
        className={`relative w-[88px] h-[120px] rounded-xl ${flipped ? effect.glowRing : ''}`}
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
