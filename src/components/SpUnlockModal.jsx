import { motion } from 'framer-motion'
import spCards from '../data/spCards'
import { useLanguage } from '../i18n/LanguageContext'

export default function SpUnlockModal({ spId, onClose }) {
  const { t, cardName } = useLanguage()
  if (!spId) return null
  const sp = spCards.find(c => c.id === spId)
  if (!sp) return null

  return (
    <motion.div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="bg-gradient-to-br from-yellow-600 to-orange-600 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl border-2 border-yellow-300"
        initial={{ scale: 0.5, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', duration: 0.6 }}
      >
        <div className="text-5xl mb-3">🎉</div>
        <div className="text-2xl font-black text-white mb-2">
          {t('spUnlock.title')}
        </div>
        <div className="text-yellow-100 text-lg font-bold mb-4">
          {cardName(sp)}
        </div>

        <div className="bg-gray-900/60 rounded-lg p-4 mb-5 text-left">
          <div className="text-xs text-yellow-300 font-bold mb-1">{t('spUnlock.effect')}</div>
          <div className="text-white text-xs leading-relaxed mb-3">
            {sp.skills?.[0]?.description || t('spUnlock.skillFallback')}
          </div>
          <div className="text-xs text-yellow-300 font-bold mb-1">{t('spUnlock.science')}</div>
          <div className="text-white/90 text-xs leading-relaxed">
            {(sp.scienceCard || '').slice(0, 120)}{sp.scienceCard?.length > 120 ? '...' : ''}
          </div>
        </div>

        <button
          onClick={onClose}
          className="bg-white text-orange-700 px-8 py-2.5 rounded-xl font-black text-base hover:bg-yellow-50 transition shadow-lg"
        >
          {t('common.awesome')}
        </button>
      </motion.div>
    </motion.div>
  )
}
