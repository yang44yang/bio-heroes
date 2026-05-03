import React from 'react'
import { motion } from 'framer-motion'

// 图鉴里程碑庆祝 — 10/25/50/75/100/120
const MILESTONE_COPY = {
  10: { emoji: '🌱', title: '图鉴入门', desc: '你已经收集了 10 张生物英雄！继续探索！' },
  25: { emoji: '🌿', title: '小有收藏', desc: '25 张了！开始组建你专属的强力卡组吧。' },
  50: { emoji: '🌳', title: '半数解锁', desc: '50 张！图鉴接近一半，你越来越懂生物了。' },
  75: { emoji: '🏆', title: '资深玩家', desc: '75 张！只差几十张就集齐图鉴了！' },
  100: { emoji: '👑', title: '生物百科', desc: '100 张！你已经认识 100 种生物英雄！' },
  120: { emoji: '🌟', title: '图鉴完成', desc: '120 张！你是真正的生物英雄收藏大师！' },
}

export default function MilestoneModal({ milestone, onClose }) {
  if (!milestone) return null
  const copy = MILESTONE_COPY[milestone] || { emoji: '🎉', title: `里程碑 ${milestone}`, desc: `你已经收集了 ${milestone} 张！` }
  return (
    <motion.div
      className="fixed inset-0 z-[108] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
        initial={{ scale: 0.5, rotate: -8, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 12 }}
        onClick={e => e.stopPropagation()}
      >
        <motion.div
          className="text-7xl mb-3"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          {copy.emoji}
        </motion.div>
        <div className="text-xs text-yellow-100 mb-1">🏆 图鉴里程碑</div>
        <div className="text-3xl font-black text-white mb-2 drop-shadow">
          {copy.title}
        </div>
        <div className="text-base text-yellow-50 mb-6 leading-relaxed">
          {copy.desc}
        </div>
        <button
          onClick={onClose}
          className="bg-white text-orange-600 font-black px-8 py-3 rounded-xl text-lg hover:bg-yellow-50 shadow-lg"
        >
          继续收集！
        </button>
      </motion.div>
    </motion.div>
  )
}

export const MILESTONES = [10, 25, 50, 75, 100, 120]
