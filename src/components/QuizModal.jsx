import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '../i18n/LanguageContext'

/**
 * QuizModal —— **由题目对象驱动的两阶段**弹窗：提问 → （判卷）→ 揭晓。
 *
 * ☠️ 这里曾是「点选项就用 `quiz.correct` 本地揭晓」。那在 PvP 里必然坏：guest 手里的题是
 *    **脱敏**的（正确答案永不上 wire），`quiz.correct` 恒 undefined → `i === undefined` 恒假
 *    → 齐齐无论答对答错都看到红色「答错了」，而且永远看不到知识卡。
 *    改成读题目对象上的 `rightIdx`（揭晓帧由权威方回填）：
 *      · 单机/host：answerQuiz 当场判卷 → dispatch 揭晓 → 本组件下一帧进反馈阶段
 *      · guest：发 answer intent → host 判卷 → 揭晓随快照回来 → 同一段代码进反馈阶段
 *    两条路径共用同一个渲染分支，不存在「PvP 专用 UI」。
 *
 * @param onSelect 点选项时触发（提交答案）。@param onAnswer 点「继续」时触发（收起弹窗+继续攻击）。
 */
export default function QuizModal({ quiz, onSelect, onAnswer }) {
  const { t } = useLanguage()
  // 本地只记「我点了哪个」用于提交前的即时高亮；对错一律等权威方揭晓。
  const [pending, setPending] = useState(null)

  if (!quiz) return null

  const diffMap = { easy: '⭐', medium: '⭐⭐', hard: '⭐⭐⭐' }
  const stars = diffMap[quiz.difficulty] || '⭐'
  const label = t(`quiz.${quiz.difficulty}`)

  // ★ 唯一的相位判据：权威方是否已回填正确答案下标
  const revealed = quiz.rightIdx != null
  const chosen = revealed ? quiz.chosenIdx : pending
  const answered = chosen != null
  const isRight = revealed && quiz.chosenIdx === quiz.rightIdx

  // 反馈阶段每个选项的样式：正确=绿✓，选错的那个=红✗，其余=暗
  const optClass = (i) => {
    if (!revealed) return i === pending ? 'bg-yellow-600 ring-2 ring-yellow-300' : 'bg-gray-700 hover:bg-yellow-600'
    if (i === quiz.rightIdx) return 'bg-green-600 ring-2 ring-green-300'
    if (i === chosen) return 'bg-red-600 ring-2 ring-red-300'
    return 'bg-gray-700/50 text-gray-400'
  }
  const optMark = (i) => {
    if (!revealed) return ''
    if (i === quiz.rightIdx) return ' ✓'
    if (i === chosen) return ' ✗'
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

          {/* 答对/答错 横幅（揭晓后）。⚠️ 提交了但还没揭晓时显示「等待判定」——
              绝不能提前说「答错了」：guest 的判卷在 host 那边，中间隔着一个来回。 */}
          {revealed && (
            <div className={`text-center font-bold text-sm sm:text-lg mb-2 sm:mb-3 ${isRight ? 'text-green-400' : 'text-red-400'}`}>
              {t(isRight ? 'quiz.correct' : 'quiz.wrong')}
            </div>
          )}
          {!revealed && answered && (
            <div className="text-center font-bold text-sm sm:text-lg mb-2 sm:mb-3 text-gray-400 animate-pulse">
              {t('quiz.judging')}
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
                onClick={() => { if (!answered) { setPending(i); onSelect?.(i) } }}
              >
                {String.fromCharCode(65 + i)}. {opt}{optMark(i)}
              </motion.button>
            ))}
          </div>

          {/* 反馈阶段：科学讲解 + 继续按钮。**揭晓后**才出现（知识卡 fact 也只在揭晓帧下发） */}
          {revealed && (
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
                onClick={() => onAnswer(chosen)}
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
