import React from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '../i18n/LanguageContext'

// 主题成就解锁庆祝弹窗 — 含科学知识包
export default function AchievementModal({ achievement, onClose }) {
  const { t } = useLanguage()
  if (!achievement) return null
  const reward = achievement.reward || {}
  return (
    <motion.div
      className="fixed inset-0 z-[107] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.9)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-gradient-to-br from-yellow-600 to-amber-700 rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto text-center shadow-2xl"
        initial={{ scale: 0.5, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 14 }}
        onClick={e => e.stopPropagation()}
      >
        <motion.div
          className="text-6xl mb-3"
          animate={{ rotate: [0, -8, 8, -4, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          {achievement.icon}
        </motion.div>

        <div className="text-xs text-yellow-200 mb-1">{t('achievement.unlocked')}</div>
        <div className="text-2xl font-black text-white mb-2 drop-shadow">{achievement.name}</div>
        {achievement.requiredCards && (
          <div className="text-yellow-100 text-sm mb-4">
            {t('achievement.collectedCards', { n: achievement.requiredCards.length })}
          </div>
        )}

        {reward.type === 'science_pack' && (
          <div className="bg-black/35 rounded-xl p-4 mb-4 text-left">
            <div className="text-yellow-300 font-bold mb-2 text-sm">{reward.title}</div>
            <div className="text-white text-xs whitespace-pre-line leading-relaxed">
              {reward.content}
            </div>
          </div>
        )}

        {reward.type === 'badge_only' && (
          <div className="bg-black/30 rounded-xl p-3 mb-4 text-yellow-100 text-sm">
            {t('achievement.badge')}
          </div>
        )}

        <button
          onClick={onClose}
          className="bg-white text-amber-700 font-black px-8 py-3 rounded-xl text-lg hover:bg-yellow-50 shadow-lg"
        >
          {t('common.awesome')}
        </button>
      </motion.div>
    </motion.div>
  )
}
