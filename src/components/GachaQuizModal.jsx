import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { quizzes } from '../data/quizzes'
import { useLanguage } from '../i18n/LanguageContext'

// 抽卡中场科学小测验（十连第 5 张后插入）
// 关键：答对答错都不影响抽卡结果，学习不应该惩罚

// 优先 easy 难度（7 岁友好），按 cardId / faction 关联刚抽到的卡
export function selectQuizForPull(pulledCards) {
  // 第一优先：cardId 完全匹配且 easy
  for (const card of pulledCards) {
    const match = quizzes.find(q => q.cardId === card.id && q.difficulty === 'easy')
    if (match) return match
  }
  // 第二：cardId 匹配（任何难度）
  for (const card of pulledCards) {
    const match = quizzes.find(q => q.cardId === card.id)
    if (match) return match
  }
  // 第三：faction 匹配 + easy
  for (const card of pulledCards) {
    const matches = quizzes.filter(q => q.faction === card.faction && q.difficulty === 'easy')
    if (matches.length > 0) return matches[Math.floor(Math.random() * matches.length)]
  }
  // 第四：随便抽一道 easy
  const easyOnes = quizzes.filter(q => q.difficulty === 'easy')
  return easyOnes[Math.floor(Math.random() * easyOnes.length)]
}

export default function GachaQuizModal({ quiz, onComplete }) {
  const { t } = useLanguage()
  const [selected, setSelected] = useState(null)
  const answered = selected !== null
  const isCorrect = selected === quiz.answer

  const handleAnswer = (idx) => {
    if (answered) return
    setSelected(idx)
  }

  return (
    <motion.div
      className="fixed inset-0 z-[125] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="bg-gray-900 border-2 border-cyan-500/70 rounded-2xl p-5 max-w-md w-full shadow-2xl shadow-cyan-500/20"
        initial={{ scale: 0.85, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 14 }}
      >
        <div className="text-center mb-4">
          <div className="text-3xl mb-1">🤔</div>
          <div className="text-[10px] text-cyan-300 mb-1">{t('gachaQuiz.intro')}</div>
          <div className="text-base font-bold text-white leading-snug">{quiz.q}</div>
        </div>

        <div className="space-y-2 mb-3">
          {quiz.options.map((option, idx) => {
            let cls = 'bg-gray-800 border-gray-600 text-white hover:border-cyan-500'
            if (answered) {
              if (idx === quiz.answer) cls = 'bg-green-900/40 border-green-500 text-green-200'
              else if (idx === selected) cls = 'bg-red-900/40 border-red-500 text-red-200'
              else cls = 'bg-gray-800 border-gray-700 text-gray-500'
            }
            return (
              <button
                key={idx}
                onClick={() => handleAnswer(idx)}
                disabled={answered}
                className={`w-full text-left p-2.5 rounded-lg border-2 text-sm transition ${cls}`}
              >
                <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span>
                {option}
                {answered && idx === quiz.answer && ' ✓'}
                {answered && idx === selected && idx !== quiz.answer && ' ✗'}
              </button>
            )
          })}
        </div>

        {answered && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-lg p-3 mb-3 ${
              isCorrect
                ? 'bg-green-900/30 border-l-4 border-green-500'
                : 'bg-orange-900/30 border-l-4 border-orange-500'
            }`}
          >
            <div className={`font-bold text-sm mb-1 ${isCorrect ? 'text-green-300' : 'text-orange-300'}`}>
              {isCorrect ? t('gachaQuiz.correct') : t('gachaQuiz.wrong', { letter: String.fromCharCode(65 + quiz.answer) })}
            </div>
            <div className="text-xs text-white leading-relaxed">📖 {quiz.fact}</div>
          </motion.div>
        )}

        {answered && (
          <button
            onClick={onComplete}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 rounded-lg"
          >
            {t('gachaQuiz.continue')}
          </button>
        )}
      </motion.div>
    </motion.div>
  )
}
