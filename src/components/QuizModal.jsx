import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '../i18n/LanguageContext'

export default function QuizModal({ quiz, onAnswer }) {
  const { t } = useLanguage()
  // 答完后进入「反馈阶段」：标出正确答案 + 讲解，再让玩家点「继续」——起到学习作用。
  const [selected, setSelected] = useState(null)

  if (!quiz) return null

  const diffMap = { easy: '⭐', medium: '⭐⭐', hard: '⭐⭐⭐' }
  const stars = diffMap[quiz.difficulty] || '⭐'
  const label = t(`quiz.${quiz.difficulty}`)

  const answered = selected !== null
  const isRight = answered && selected === quiz.correct

  // 反馈阶段每个选项的样式：正确=绿✓，选错的那个=红✗，其余=暗
  const optClass = (i) => {
    if (!answered) return 'bg-gray-700 hover:bg-yellow-600'
    if (i === quiz.correct) return 'bg-green-600 ring-2 ring-green-300'
    if (i === selected) return 'bg-red-600 ring-2 ring-red-300'
    return 'bg-gray-700/50 text-gray-400'
  }
  const optMark = (i) => {
    if (!answered) return ''
    if (i === quiz.correct) return ' ✓'
    if (i === selected) return ' ✗'
    return ''
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-gray-800 border-2 border-yellow-400 rounded-2xl p-3 sm:p-6 mx-2 sm:mx-4 max-w-md w-[95%] sm:w-full shadow-2xl max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.5, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 15 }}
        >
          {/* 标题 */}
          <div className="text-center mb-2 sm:mb-4">
            <div className="text-yellow-400 text-sm sm:text-lg font-bold mb-0.5 sm:mb-1">{t('quiz.title')}</div>
            <div className="text-[10px] sm:text-xs text-gray-400">{stars} {label}</div>
          </div>

          {/* 问题 */}
          <div className="text-white text-center text-sm sm:text-lg font-bold mb-3 sm:mb-4">
            {quiz.question}
          </div>

          {/* 答对/答错 横幅（反馈阶段） */}
          {answered && (
            <div className={`text-center font-bold text-sm sm:text-lg mb-2 sm:mb-3 ${isRight ? 'text-green-400' : 'text-red-400'}`}>
              {t(isRight ? 'quiz.correct' : 'quiz.wrong')}
            </div>
          )}

          {/* 选项 */}
          <div className="space-y-1.5 sm:space-y-3">
            {quiz.options.map((opt, i) => (
              <motion.button
                key={i}
                disabled={answered}
                className={`w-full py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg sm:rounded-xl text-white font-medium text-left text-xs sm:text-base transition-colors min-h-[44px] ${optClass(i)}`}
                whileHover={answered ? undefined : { scale: 1.02 }}
                whileTap={answered ? undefined : { scale: 0.98 }}
                onClick={() => { if (!answered) setSelected(i) }}
              >
                {String.fromCharCode(65 + i)}. {opt}{optMark(i)}
              </motion.button>
            ))}
          </div>

          {/* 反馈阶段：科学讲解 + 继续按钮 */}
          {answered && (
            <>
              {quiz.fact && (
                <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-gray-900/70 border border-yellow-500/40 rounded-lg text-gray-100 text-xs sm:text-sm leading-relaxed">
                  📖 {quiz.fact}
                </div>
              )}
              <motion.button
                className="mt-3 sm:mt-4 w-full py-2.5 sm:py-3 bg-yellow-500 hover:bg-yellow-400 rounded-lg sm:rounded-xl text-gray-900 font-bold text-sm sm:text-base min-h-[44px]"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onAnswer(selected)}
              >
                {t('quiz.continue')}
              </motion.button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
