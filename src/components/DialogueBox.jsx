import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * DialogueBox — 战前/战中/战后对话框
 *
 * Props:
 *   dialogues: [{ speaker, emoji, text }]
 *   currentIdx: number (当前显示第几句)
 *   onNext: () => void (点击继续)
 *   onSkip: () => void (跳过全部)
 */
export default function DialogueBox({ dialogues, currentIdx, onNext, onSkip }) {
  if (!dialogues || currentIdx >= dialogues.length) return null

  const d = dialogues[currentIdx]
  const isEnemy = d.speaker === 'enemy'
  const isNarrator = d.speaker === 'narrator'

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 pb-4 px-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onNext}
    >
      <motion.div
        className={`w-full max-w-lg rounded-2xl p-4 border-2 relative ${
          isNarrator
            ? 'bg-indigo-950/95 border-indigo-500'
            : isEnemy
            ? 'bg-red-950/95 border-red-600'
            : 'bg-blue-950/95 border-blue-500'
        }`}
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        key={currentIdx}
        onClick={e => e.stopPropagation()}
      >
        {/* 角色 emoji + 名称 */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{d.emoji || '💬'}</span>
          <span className={`text-xs font-bold ${
            isNarrator ? 'text-indigo-300' : isEnemy ? 'text-red-300' : 'text-blue-300'
          }`}>
            {isNarrator ? '旁白' : isEnemy ? '敌方' : '你'}
          </span>
        </div>

        {/* 对话文本 */}
        <motion.p
          className="text-sm text-gray-100 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {d.text}
        </motion.p>

        {/* 底部操作 */}
        <div className="flex justify-between items-center mt-3">
          <button
            className="text-[10px] text-gray-500 hover:text-gray-300"
            onClick={(e) => { e.stopPropagation(); onSkip() }}
          >
            跳过对话
          </button>
          <button
            className={`text-xs px-3 py-1 rounded-lg font-bold ${
              isNarrator ? 'bg-indigo-700 text-indigo-100' : isEnemy ? 'bg-red-700 text-red-100' : 'bg-blue-700 text-blue-100'
            }`}
            onClick={(e) => { e.stopPropagation(); onNext() }}
          >
            {currentIdx < dialogues.length - 1 ? '继续 →' : '开始！'}
          </button>
        </div>

        {/* 进度指示器 */}
        <div className="flex gap-1 justify-center mt-2">
          {dialogues.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${i === currentIdx ? 'bg-white' : 'bg-gray-600'}`}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
