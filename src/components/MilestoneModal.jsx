import React from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '../i18n/LanguageContext'

// 图鉴里程碑庆祝 — 10/25/50/75/100/120
const MILESTONE_EMOJI = { 10: '🌱', 25: '🌿', 50: '🌳', 75: '🏆', 100: '👑', 120: '🌟' }

export default function MilestoneModal({ milestone, onClose }) {
  const { t } = useLanguage()
  if (!milestone) return null
  const known = MILESTONE_EMOJI[milestone]
  const copy = {
    emoji: known || '🎉',
    title: known ? t(`milestone.t${milestone}`) : t('milestone.tGeneric', { n: milestone }),
    desc: known ? t(`milestone.d${milestone}`) : t('milestone.dGeneric', { n: milestone }),
  }
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
        <div className="text-xs text-yellow-100 mb-1">{t('milestone.header')}</div>
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
          {t('milestone.continue')}
        </button>
      </motion.div>
    </motion.div>
  )
}

export const MILESTONES = [10, 25, 50, 75, 100, 120]
