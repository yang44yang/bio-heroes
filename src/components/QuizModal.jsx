import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const diffMap = { easy: '⭐', medium: '⭐⭐', hard: '⭐⭐⭐' }
const diffLabel = { easy: '初级', medium: '中级', hard: '高级' }

export default function QuizModal({ quiz, onAnswer }) {
  if (!quiz) return null

  const stars = diffMap[quiz.difficulty] || '⭐'
  const label = diffLabel[quiz.difficulty] || '初级'

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-gray-800 border-2 border-yellow-400 rounded-2xl p-3 sm:p-6 mx-2 sm:mx-4 max-w-md w-[95%] sm:w-full shadow-2xl"
          initial={{ scale: 0.5, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 15 }}
        >
          {/* 标题 */}
          <div className="text-center mb-2 sm:mb-4">
            <div className="text-yellow-400 text-sm sm:text-lg font-bold mb-0.5 sm:mb-1">🧠 觉醒问答！</div>
            <div className="text-[10px] sm:text-xs text-gray-400">{stars} {label}</div>
          </div>

          {/* 问题 */}
          <div className="text-white text-center text-sm sm:text-lg font-bold mb-3 sm:mb-6">
            {quiz.question}
          </div>

          {/* 选项 */}
          <div className="space-y-1.5 sm:space-y-3">
            {quiz.options.map((opt, i) => (
              <motion.button
                key={i}
                className="w-full py-2 sm:py-3 px-3 sm:px-4 bg-gray-700 hover:bg-yellow-600 rounded-lg sm:rounded-xl text-white font-medium text-left text-xs sm:text-base transition-colors min-h-[36px]"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onAnswer(i)}
              >
                {String.fromCharCode(65 + i)}. {opt}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
